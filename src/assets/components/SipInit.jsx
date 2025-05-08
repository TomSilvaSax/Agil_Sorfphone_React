import { useEffect, useState, useRef } from "react";
import { UserAgent, Registerer, SessionState } from "sip.js";
import PropTypes from "prop-types";
import { loadCredentials } from "../components/loadCredentials";
import { setUserAgent } from "../utils/sipUserAgent";
import CallTimer from "./CallTimer";
import { useNavigate } from "react-router-dom";

export default function SipInit({
  callNotificationRef,
  remoteAudioRef,
  callStartTime,
  setCallStartTime,
  setCallTimer,
  setUa,
}) {
  const [playRigtoni, setplayRigtoni] = useState(true);
  const [mostraTime, setMostraTime] = useState(true);
  const [piscarTimer, setPiscarTimer] = useState(false);
  const localStreamRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const activeSessionRef = useRef(null);
  const navigate = useNavigate();

  const [incomingCall, setIncomingCall] = useState({
    visible: false,
    responseChamada: "",
    callerNumber: "",
    invitation: null,
  });
  // Função para aceitar a chamada
  const handleAcceptCall = async () => {
    if (incomingCall.invitation) {
      const invitation = incomingCall.invitation;
      activeSessionRef.current = invitation;

      await invitation.accept();
      console.log("✅ Chamada atendida.");
      setplayRigtoni(false);
      setCallStartTime(new Date());
      setMostraTime(true);
      setPiscarTimer(false); // <- desativa o piscar

      const session = invitation; // ou só use invitation direto
      const remoteStream = new MediaStream();
      const localStream = new MediaStream();

      session.sessionDescriptionHandler.peerConnection
        .getSenders()
        .forEach((sender) => {
          if (sender.track && sender.track.kind === "audio") {
            localStream.addTrack(sender.track);
          }
        });

      // Armazene no estado ou ref
      localStreamRef.current = localStream;

      // Vincula os tracks de mídia recebidos no peer connection ao stream
      session.sessionDescriptionHandler.peerConnection
        .getReceivers()
        .forEach((receiver) => {
          if (receiver.track && receiver.track.kind === "audio") {
            remoteStream.addTrack(receiver.track);
          }
        });

      // Atribui o stream ao elemento de áudio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((err) => {
          console.error("Erro ao reproduzir áudio remoto:", err);
        });
      }

      // 🔧 Define o onBye DEPOIS do accept

      invitation.delegate = {
        onBye: () => {
          console.log("👋 Outro lado finalizou a chamada (pós-accept).");

          setCallStartTime(null);
          setCallTimer(null);
          activeSessionRef.current = null;

          setPiscarTimer(true); // <- desativa o piscar

          setIncomingCall((prev) => ({
            ...prev,
            visible: true,
            responseChamada: "👋 Chamada finalizada.",
          }));

          setTimeout(() => {
            setIncomingCall((prev) => ({
              ...prev,
              visible: false,
              callerNumber: "",
            }));
            setMostraTime(false);
          }, 3000);
        },
      };

      setIncomingCall((prev) => ({
        ...prev,
        responseChamada: "✅ Chamada atendida.",
      }));
    }
  };

  //Função única para rejeitar ou desligar:
  const handleHangUpOrReject = async () => {
    if (!incomingCall.invitation) return;

    const state = incomingCall.invitation.state;

    try {
      if (
        state === SessionState.Initial ||
        state === SessionState.Establishing
      ) {
        // Rejeita a chamada ainda não atendida
        await incomingCall.invitation.reject(); // Tenta cancelar a chamada
        console.log("❌ Chamada rejeitada.");
        activeSessionRef.current = null;
      } else if (state === SessionState.Established) {
        // Encerra a chamada em andamento
        await incomingCall.invitation.bye(); // Envia BYE para encerrar a chamada
        console.log("📴 Chamada desligada.");
        setCallStartTime(null);
        setPiscarTimer(true); // <- desativa o piscar
        activeSessionRef.current = null;
      } else {
        console.warn(
          "⚠️ Nenhuma ação possível para o estado da chamada:",
          state
        );
      }

      setIncomingCall((prev) => ({
        ...prev,
        responseChamada:
          state === SessionState.Established
            ? "📴 Chamada desligada."
            : "❌ Chamada rejeitada.",
      }));

      // Esconde a notificação após 3 segundos
      setTimeout(() => {
        setIncomingCall({ visible: false, invitation: null });
      }, 3000);
    } catch (err) {
      console.error("Erro ao rejeitar ou desligar a chamada:", err);
    }
  };

  useEffect(() => {
    let userAgent;
    let registerer;
    async function initializeSIP() {
      const credentials = await loadCredentials();

      if (!credentials) {
        console.warn("⚠️ Nenhuma credencial válida encontrada.");
        return;
      }

      console.log("✅ Credenciais carregadas:", credentials);

      const nameDomain = credentials.domain || "ubc.agiltelecom.com.br";
      const sipPort = credentials.port || "6443";
      const serverUri = `wss://${nameDomain}:${sipPort}`;
      const uri = UserAgent.makeURI(`sip:${credentials.ramal}@${nameDomain}`);

      if (!uri) {
        console.error("📛 URI inválida.");
        return;
      }

      userAgent = new UserAgent({
        uri,
        transportOptions: {
          server: serverUri,
        },
        authorizationUsername: credentials.ramal,
        authorizationPassword: credentials.password,
        displayName: `${credentials.firstName} ${credentials.lastName}`,
        userAgentString: "SIP.js/0.20.0 AgilSoftphone",
        logLevel: "debug",
      });

      registerer = new Registerer(userAgent);
      setUa(userAgent);
      setUserAgent(userAgent);

      userAgent.delegate = {
        onInvite: async (invitation) => {
          console.log("📞 Chamada recebida!");

          // 🚫 Se já estiver em outra chamada, rejeita com 'User Busy'
          if (activeSessionRef.current) {
            console.log("📵 Ocupado. Rejeitando com 486.");
            await invitation.reject({
              statusCode: 486,
              reasonPhrase: "User Busy",
            });
            return;
          }

          // ✅ Defina o delegate aqui, logo que o invitation chega
          invitation.delegate = {
            onCancel: () => {
              console.log("❌ Chamada cancelada antes de atender.");
              setplayRigtoni(false);
              setIncomingCall({
                visible: true,
                responseChamada: "❌ Chamada cancelada.",
                callerNumber: invitation.remoteIdentity.uri.user,
                invitation: null,
              });
              setTimeout(() => {
                setIncomingCall({ visible: false, invitation: null });
              }, 3000);
            },
          };

          // ✅ Sem chamada ativa: processa normalmente
          setplayRigtoni(true);

          const caller = invitation.remoteIdentity.uri.user;

          setIncomingCall({
            visible: true,
            responseChamada: "📞 Chamada recebida!",
            callerNumber: caller,
            invitation,
          });

          // Reset temporizador da chamada
          setCallStartTime(null);
          setCallTimer(null);
        },
      };

      try {
        await userAgent.start();
        await registerer.register();
        console.log("✅ Registrado no servidor SIP.");
      } catch (err) {
        console.error("❌ Erro ao registrar:", err);
        alert("Erro ao conectar ao servidor SIP: " + err.message);
        // navigate("/");
        // logout()
      }
    }

    initializeSIP();

    return () => {
      if (userAgent) {
        userAgent.stop().then(() => console.log("🛑 SIP finalizado."));
      }
    };
  }, []);

  const ringtoneRef = useRef(null);
  const toggleMute = () => {
    const localStream = localStreamRef.current;

    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const isCurrentlyEnabled = audioTracks[0].enabled;
        const newEnabledState = !isCurrentlyEnabled;

        audioTracks.forEach((track) => {
          track.enabled = newEnabledState;
        });

        setIsMuted(!newEnabledState);
        console.log(
          newEnabledState ? "🎙️ Microfone ativado" : "🔇 Microfone desativado"
        );
      }
    }
  };

  useEffect(() => {
    const audio = ringtoneRef.current;

    if (!audio) return; // <- garante que o elemento existe

    if (playRigtoni) {
      audio.play().catch((err) => {
        console.error("Erro ao tocar o ringtone:", err);
      });
      console.log("🔊 Ringtone tocando");
    } else {
      audio.pause();
      audio.currentTime = 0;
      console.log("🔇 Ringtone parado");
    }
  }, [playRigtoni]);

  return (
    incomingCall.visible && (
      <div
        ref={callNotificationRef}
        className="fixed bottom-4 right-4 bg-white shadow-lg p-5 rounded-xl w-[200px] z-50"
      >
        <div className="text-sm text-gray-700 mb-2">
          {incomingCall.responseChamada}
        </div>
        <div className=" font-semibold text-gray-800 text-center">
          {incomingCall.callerNumber}
        </div>

        {mostraTime && (
          <CallTimer
            callStartTime={callStartTime}
            className="text-sm text-gray-700 mb-2"
            piscar={piscarTimer}
          />
        )}
        <button onClick={toggleMute}>{isMuted ? " 🔊" : " 🔇"}</button>
        <div className="flex justify-center items-center gap-[70px] w-full mt-[10px]">
          <button onClick={handleAcceptCall} className="call-button">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                fill="#4CAF50"
                d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 21.43 2.57 13.93 2.5 4a1 1 0 011-1H7a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z"
              />
            </svg>
          </button>

          <button onClick={handleHangUpOrReject} className="call-button">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                fill="#F44336"
                d="M21 15.46l-5.27-.61-2.09 2.09a16.001 16.001 0 01-7.58-7.58l2.09-2.09-.61-5.27L3.1 2C2.8 2 2.52 2.11 2.29 2.29l-2 2C-.11 4.48 0 4.77 0 5.1c.01 10.49 8.41 18.99 18.9 19 0 .01.29-.11.71-.29l2-2c.18-.23.29-.51.29-.81l-1.9-5.54z"
              />
            </svg>
          </button>
        </div>
        <audio
          ref={remoteAudioRef}
          autoPlay
          style={{ display: "none" }} // esconde o player se quiser
        />
        <audio
          ref={ringtoneRef}
          src="/toques/message-for-you-ringtone-music-for-phone-and-messenger-5495.mp3"
          loop
        />
      </div>
    )
  );
}

SipInit.propTypes = {
  callNotificationRef: PropTypes.object.isRequired,
  remoteAudioRef: PropTypes.object.isRequired,
  callStartTime: PropTypes.instanceOf(Date),
  setCallStartTime: PropTypes.func.isRequired,
  setCallTimer: PropTypes.func.isRequired,
  setUa: PropTypes.func.isRequired,
};
