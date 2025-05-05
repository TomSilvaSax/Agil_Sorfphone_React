import { useRef, useState, useEffect } from "react";
import DialPad from "../components/DialPad";
import CallTimer from "../components/CallTimer";
import SipInit from "../components/SipInit";
import { useNavigate } from "react-router-dom";
import makeCall, { endCall } from "../components/MakeCall";
import { currentSession } from "../components/MakeCall";
import { loadCredentials } from "../components/loadCredentials";
import { validarNumeroTelefone } from "../utils/validatePhoneNumber";

export default function AgilPhone() {
  // const [permissaoMicrofone, setPermissaoMicrofone] = useState(null); // Estado para armazenar a permissão do microfone (concedida, negada ou null)
  //const [permissaoNotificacao, setPermissaoNotificacao] = useState(null); // Estado para armazenar a permissão de notificação (concedida, negada ou null)
  const [chamando, setChamando] = useState("Terminated"); // Estado que indica se há uma chamada em andamento (true ou false)
  const callNotificationRef = useRef(); // Referência usada para gerenciar notificações de chamada (ex: toast ou alerta visual)
  const remoteAudioRef = useRef(); // Referência ao elemento de áudio remoto, onde o áudio da chamada será reproduzido
  const [numeroDiscado, setNumeroDiscado] = useState(""); // Estado que armazena o número de telefone digitado pelo usuário
  const [callStartTime, setCallStartTime] = useState(null); // Estado que registra o horário de início da chamada (usado para o cronômetro)
  const [callTimer, setCallTimer] = useState(null); // Estado que armazena o timer da chamada (para exibir a duração em tempo real)
  const [ua, setUa] = useState(null); // Estado que mantém a instância da UserAgent (UA) do SIP.js
  const [statusMessage, setStatusMessage] = useState(""); // Estado que armazena mensagens de status da chamada (ex: "Ligando...", "Conectado")
  const [isMuted, setIsMuted] = useState(false); // Estado que indica se o microfone está mutado durante a chamada
  const [credentials, setCredentials] = useState(null); // Estado que armazena as credenciais carregadas do usuário (nome, ramal, token etc.)
  const [numeroValido, setNumeroValido] = useState(false); // Estado que indica se o número digitado é válido para realizar uma chamada
  const [piscarTimer, setPiscarTimer] = useState(false); // pisca o cronometro no final da ligação
  const [incomingCall, setIncomingCall] = useState(false); // ativa o rigtonr

  const navigate = useNavigate(); //useNavigate é um hook do React Router que retorna uma função chamada navigate

  // Função para solicitar permissão para notificações
  const solicitarPermissaoNotificacoes = () => {
    if (!("Notification" in window)) {
      console.warn("Este navegador não suporta notificações.");
      return;
    }

    switch (Notification.permission) {
      case "granted":
        console.log("Notificações já permitidas.");
        break;
      case "denied":
        console.log("Permissão para notificações foi negada anteriormente.");
        break;
      case "default":
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Permissão concedida para notificações.");
          } else {
            console.log("Permissão negada para notificações.");
          }
        });
        break;
    }
  };

  // Função para solicitar permissão para o microfone
  const solicitarPermissaoMicrofone = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        console.log("🎤 Permissão concedida!");

        stream.getTracks().forEach((track) => track.stop()); // Para o stream após a permissão
      })
      .catch((error) => {
        console.error("🚨 ERRO ao acessar o microfone:", error);
      });
  };

  useEffect(() => {
    // Solicitar permissões ao carregar o componente
    solicitarPermissaoNotificacoes();
    solicitarPermissaoMicrofone();
    console.log("solicitarPermissaoMicrofone");
  }, []); // O array vazio [] garante que a solicitação seja feita apenas uma vez ao montar o componente

  // Definição dos estados principais e refs

  useEffect(() => {
    async function fetchCredentials() {
      const creds = await loadCredentials();
      if (creds) {
        // console.log("✅ Credenciais carregadas:", creds);
        setCredentials(creds);
      } else {
        console.warn("⚠️ Nenhuma credencial válida encontrada.");
        navigate("/");
      }
    }

    fetchCredentials();
  }, []);

  function logout() {
    // Remove dados salvos localmente
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("password");
    localStorage.removeItem("passwordIV");
    localStorage.removeItem("key");

    console.log("🔒 Credenciais removidas.");

    if (ua) {
      console.log("🔌 Desconectando do servidor SIP...");

      ua.stop()
        .then(() => {
          console.log("✅ Desconectado do servidor SIP com sucesso.");
          const el = document.getElementById("responseSIP");
          if (el) el.textContent = "Você saiu com sucesso!";

          navigate("/");
        })
        .catch((error) => {
          console.error("❌ Erro ao desconectar do SIP:", error);
          const el = document.getElementById("responseSIP");
          if (el) el.textContent = "Erro ao sair.";
        });
    } else {
      console.warn("⚠️ Nenhuma instância SIP encontrada.");
      const el = document.getElementById("responseSIP");
      if (el) el.textContent = "Erro: instância SIP não encontrada.";
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key } = event;

      if ((key >= "0" && key <= "9") || key === "Backspace") {
        handleNumberClick(key); // Lida com números e backspace
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Funções  para manipular dígitos e ligar
  const handleNumberClick = (key) => {
    setNumeroDiscado((prev) => {
      let novoNumero;

      if (key === "Backspace") {
        novoNumero = prev.replace(/\D/g, "").slice(0, -1); // Remove último dígito puro
      } else if (key >= "0" && key <= "9") {
        novoNumero = prev.replace(/\D/g, "") + key; // Adiciona número
      } else {
        return prev; // Ignora qualquer outra tecla
      }

      const { numeroValido, numeroFormatado } =
        validarNumeroTelefone(novoNumero) || {};
      setNumeroValido(numeroValido);

      return numeroFormatado || novoNumero;
    });
  };

  //Função para mutar a chamada
  const handleMute = () => {
    setIsMuted((prevMuted) => {
      const newMuteState = !prevMuted;

      console.log("🔧 handleMute foi chamado");
      const sender = currentSession.sessionDescriptionHandler?.peerConnection
        ?.getSenders()
        .find((s) => s.track && s.track.kind === "audio");

      if (sender && sender.track) {
        sender.track.enabled = !newMuteState;
        console.log(`🔇 Microfone ${newMuteState ? "mutado" : "ativado"}`);
      }

      return newMuteState;
    });
  };

  // Callback para atualizar o status vindo do SipInit
  const handleStatusChange = (message) => {
    setStatusMessage(message);
  };

  // Logica para realizar chamadas
  const handleCallButton = () => {
    if (chamando === "Terminated" && numeroValido) {
      makeCall(
        numeroDiscado, // passa o numero discado
        setStatusMessage, // passa a mensagem de status
        remoteAudioRef, // ativa o audio
        setChamando
      );
    } else {
      endCall();
    }
  };

  useEffect(() => {
    if (chamando == "Establishing") {
      setIncomingCall(true); // <- ativa o rigtone
    }

    if (chamando == "Established") {
      setCallStartTime(new Date()); // <- ativa o hora de inicio da conexão
      setPiscarTimer(false); // <- desativa o piscar
      setIncomingCall(false); // <- desativa o rigtone
      setCallTimer(true);
    }
    if (chamando == "Terminated") {
      setCallStartTime(null);
      setPiscarTimer(true); // <- ativa o piscar
      setIncomingCall(false); // <- desativa o rigtone

      setTimeout(() => {
        setCallTimer(false);
      }, 3000);
    }
  }, [chamando]);

  const ringtoneRef = useRef(null);

  useEffect(() => {
    const audio = ringtoneRef.current;
    if (incomingCall) {
      audio.play().catch(console.error);
      console.log("audio.play()");
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [incomingCall]);

  return (
    <div className="phone-app bg-[url('public/img/slide1-1-bw.jpg')] bg-cover bg-center w-full h-screen">
      <div className="flex flex-col text-center p-2 rounded-xl shadow-lg max-w-xs mx-auto">
        <button id="sair" onClick={logout}>
          Sair
        </button>
        {credentials && ( // Verifica se 'credentials' não é null ou undefined antes de renderizar
          <>
            {/* Fragmento React: usado para agrupar múltiplos elementos sem criar uma <div> extra */}
            <h2>
              {/* Mostra o nome completo do usuário se as credenciais estiverem carregadas */}
              Bem Vindo: {credentials.firstName} {credentials.lastName}
            </h2>
            <h4>
              {/* Mostra o ramal do usuário */}
              Ramal: {credentials.ramal}
            </h4>
          </>
        )}
      </div>

      <input
        //grid p-2 rounded-xl shadow-lg max-w-xs mx-auto
        className={`grid p-2 rounded-xl shadow-lg max-w-xs mx-auto border-2 text-center ${
          numeroDiscado.length > 0 && !numeroValido
            ? "border-red-500"
            : "border-gray-300"
        }`}
        type="tel"
        name="numberB"
        id="numberB"
        value={numeroDiscado}
        readOnly
        placeholder="Ex: (xx)xxxx-xxxx"
      ></input>
      <div className="status-chamadas text-center">
        {statusMessage && <p>{statusMessage}</p>}
        {callTimer && (
          <CallTimer callStartTime={callStartTime} piscar={piscarTimer} />
        )}
      </div>

      {/* Componentes de interação */}

      <DialPad
        onNumberClick={handleNumberClick}
        onCall={handleCallButton}
        onMute={handleMute}
        isMuted={isMuted}
        callEnabled={numeroValido}
        chamando={chamando} // Passando chamando como prop
      />

      {/* Componente de inicialização SIP */}
      <SipInit
        callNotificationRef={callNotificationRef}
        remoteAudioRef={remoteAudioRef}
        setCallStartTime={setCallStartTime}
        setCallTimer={setCallTimer}
        ua={ua}
        setUa={setUa}
        onStatusChange={handleStatusChange}
        setChamando={setChamando}
        callStartTime={callStartTime}
      />

      {/* Componente de audio */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        style={{ display: "none" }} // esconde o player se quiser
      />
      <audio ref={ringtoneRef} src="/toques/dial-tone_uk-88895.mp3" loop />
    </div>
  );
}
