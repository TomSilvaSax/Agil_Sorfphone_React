import React, { useState, useEffect } from "react";
import { loadCredentials } from "./assets/components/loadCredentials"; // Supondo que loadCredentials esteja exportado
import InitSip from "./assets/components/SipInit";

function App() {
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      const data = await loadCredentials();
      setCredentials(data); // Armazena as credenciais no estado
    };

    fetchCredentials();
  }, []);

  return (
    <div>
      {/* Passando as credenciais para o componente InitSip via props */}
      {credentials ? (
        <InitSip credentials={credentials} />
      ) : (
        <p>Carregando credenciais...</p>
      )}
    </div>
  );
}

export default App;
