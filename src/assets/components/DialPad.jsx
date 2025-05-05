import { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function DialPad({
  onNumberClick,
  onCall,
  onMute,
  isMuted,
  callEnabled,
  chamando, // O estado atual da chamada (Terminated, Established, etc.)

  // <- recebe a sessão atual para monitorar
}) {
  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  // Use state para controlar o estado da chamada
  const [chamada, setChamada] = useState(false); // Inicia a chamada como falsa

  // Monitorando o estado da chamada com useEffect
  useEffect(() => {
    console.log("📶 Estado da setChamando:", chamando);

    if (chamando === "Terminated") {
      setTimeout(() => {
        setChamada(false); // Se a chamada foi terminada, altera o estado de chamada
      }, 3000);
    }

    if (chamando === "Establishing" || chamando == true) {
      setChamada(true); // Se a chamada foi terminada, altera o estado de chamada
    }
  }, [chamando]); // Dependência em chamando para atualizar quando o estado da chamada mudar

  useEffect(() => {
    console.log("📶 Estado atual da chamada:", chamada); // Exibe o estado da chamada atualizado
  }, [chamando]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key } = event;

      if (buttons.includes(key)) {
        onNumberClick(key);
      }

      if (key === "Enter" && callEnabled) {
        onCall();
      }

      if (key === "Backspace" && callEnabled) {
        onNumberClick("backspace");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [buttons, callEnabled, onCall, onNumberClick]);

  return (
    <div className="call-controls dial-pad grid grid-cols-3 gap-6 p-4 bg-white/50 rounded-xl shadow-lg max-w-xs mx-auto">
      {buttons.map((num) => (
        <button
          key={num}
          onClick={() => onNumberClick(num)}
          className="bg-gray-200 hover:bg-gray-300 font-bold rounded-full shadow h-16 text-xl"
        >
          {num}
        </button>
      ))}

      <button
        onClick={onMute}
        className="col-span-3 mt-2 font-bold py-2 rounded-xl shadow text-white bg-yellow-500"
      >
        {isMuted ? "Desmutar" : "Mutar"}
      </button>

      <div className="flex flex-space-between gap-20">
        <button
          onClick={onCall}
          disabled={!callEnabled}
          className={`col-span-3 mt-4 font-bold py-2 px-4 rounded-xl shadow text-white hover:bg-opacity-80 ${
            !callEnabled
              ? "bg-gray-400 cursor-not-allowed"
              : chamada
              ? "bg-red-500"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {chamada ? "Desligar" : "Ligar"}
        </button>

        <button
          onClick={() => onNumberClick("Backspace")}
          id="apagar"
          className="bg-gray-200 hover:bg-gray-300 font-bold rounded-full shadow h-16 text-xl"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

// Validação de props
DialPad.propTypes = {
  onNumberClick: PropTypes.func.isRequired,
  onCall: PropTypes.func.isRequired,
  onMute: PropTypes.func.isRequired,
  isMuted: PropTypes.bool.isRequired,
  callEnabled: PropTypes.bool.isRequired,
  chamando: PropTypes.string.isRequired, // Agora chamando é uma string, indicando o estado da chamada
  ua: PropTypes.object,
  session: PropTypes.object, // <- adicionada
};
