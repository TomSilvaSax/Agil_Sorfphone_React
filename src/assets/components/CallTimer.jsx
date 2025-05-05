// Cronômetro da chamada
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function CallTimer({ callStartTime, piscar }) {
  const [elapsed, setElapsed] = useState(0);
  const [mostrarTimer, setMostrarTimer] = useState(false);

  useEffect(() => {
    if (callStartTime) {
      setMostrarTimer(true);
    } else {
      setTimeout(() => {
        setMostrarTimer(false);
        setElapsed(0); //  Aqui você zera o cronômetro
      }, 3000);
    }
  }, [callStartTime]);

  useEffect(() => {
    if (!callStartTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((new Date() - new Date(callStartTime)) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (!mostrarTimer) {
    return null; // Não renderiza nada se mostrarTimer for false
  }

  console.log();
  return (
    <div
      className={`call-timer transition-opacity duration-500 text-center ${
        piscar ? "animate-blink" : ""
      }`}
      style={{
        opacity: mostrarTimer ? 1 : 0,
        height: mostrarTimer ? "auto" : 0,
        overflow: "hidden",
      }}
    >
      Duração: {minutes}:{seconds < 10 ? "0" : ""}
      {seconds}
    </div>
  );
}

CallTimer.propTypes = {
  piscar: PropTypes.bool,
  callStartTime: PropTypes.instanceOf(Date),
};
