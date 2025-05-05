// Exibição de status (chamada conectada, em progresso, etc.)

//import React from "react";
import PropTypes from "prop-types"; // Importa o PropTypes

export default function CallStatus({ statusMessage }) {
  return <div className="call-status">{statusMessage}</div>;
}

// Validação de props
CallStatus.propTypes = {
  statusMessage: PropTypes.string, // <- agora aceita string
};
