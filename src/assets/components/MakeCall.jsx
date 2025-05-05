import { UserAgent, Inviter, SessionState } from "sip.js";
import { getUserAgent } from "../utils/sipUserAgent";

export let currentSession = null;

export default function makeCall(
  numeroDiscado,
  setStatusMessage,
  remoteAudioRef,
  setChamando
) {
  const userAgent = getUserAgent();

  if (
    !userAgent ||
    userAgent.state !== "Started" ||
    userAgent.transport?.state !== "Connected"
  ) {
    setStatusMessage("⛔ SIP ainda não conectado.");
    return;
  }

  const numero = numeroDiscado.replace(/\D/g, "");
  const targetURI =
    numero.length > 4
      ? `sip:0${numero}@ubc.agiltelecom.com.br`
      : `sip:${numero}@ubc.agiltelecom.com.br`;

  const ruri = UserAgent.makeURI(targetURI);
  if (!ruri) {
    setStatusMessage("📛 URI inválida, verifique o número discado.");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then(async (stream) => {
      const inviter = new Inviter(userAgent, ruri, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
          offerOptions: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          },
        },
      });

      currentSession = inviter;

      inviter.stateChange.addListener((state) => {
        const mensagens = {
          [SessionState.Establishing]: "⏳ Chamando...",
          [SessionState.Established]: "✅ Chamada atendida!",
          [SessionState.Terminated]: "❌ Chamada finalizada.",
        };

        setStatusMessage(mensagens[state] || "");
        setChamando(state); // passa o estado da chamada

        if (state === SessionState.Terminated) {
          setTimeout(() => setStatusMessage(""), 3000);
        }
      });

      try {
        await inviter.invite(); // <- só depois do invite que sessionDescriptionHandler estará disponível
        console.log("📞 Chamada iniciada com sucesso.");

        const handler = inviter.sessionDescriptionHandler;

        if (!handler) {
          console.error("❌ sessionDescriptionHandler não disponível.");
          return;
        }

        const pc = handler.peerConnection;

        // Injeta áudio local
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Escuta áudio remoto
        pc.addEventListener("track", (event) => {
          if (event.track.kind === "audio") {
            const remoteStream = event.streams[0];
            const audioEl = remoteAudioRef.current;

            if (audioEl) {
              audioEl.srcObject = remoteStream;
              audioEl.muted = false;
              audioEl.volume = 1;
              audioEl.play().catch(console.error);

              navigator.mediaDevices.enumerateDevices().then((devices) => {
                const speakers = devices.filter(
                  (d) => d.kind === "audiooutput"
                );
                if (speakers.length && audioEl.setSinkId) {
                  audioEl
                    .setSinkId(speakers[0].deviceId)
                    .then(() =>
                      console.log(
                        "🔈 Saída de áudio definida para:",
                        speakers[0].label
                      )
                    )
                    .catch((err) =>
                      console.warn("⚠️ Erro ao definir saída:", err)
                    );
                }
              });
            }
          }
        });
      } catch (error) {
        console.error("🚨 Erro ao realizar a chamada:", error);
        setStatusMessage("🚨 Erro ao realizar a chamada.");
      }
    })
    .catch((error) => {
      console.error("🚨 Erro ao acessar o microfone:", error);
      alert(
        "Erro ao acessar o microfone. Verifique as permissões do navegador."
      );
    });
}

//Função para exerrar chamadas
export function endCall() {
  if (currentSession) {
    const state = currentSession.state;

    if (
      state !== SessionState.Terminated &&
      state !== SessionState.Terminating
    ) {
      console.log("📴 Encerrando chamada...");

      if (state === SessionState.Established) {
        currentSession.bye(); // chamada já foi atendida
      } else if (
        state === SessionState.Establishing ||
        state === SessionState.Initial
      ) {
        currentSession.cancel(); // chamada ainda não foi atendida
      } else {
        console.warn(
          "⚠️ Estado da sessão inesperado ao tentar encerrar:",
          state
        );
      }
    }
  } else {
    console.warn("⚠️ Nenhuma chamada ativa para encerrar.");
  }
}
