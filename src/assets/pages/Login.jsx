// CredentialLoader.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    new TextEncoder().encode(data)
  );
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

function CredentialLoader() {
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const [modo, setModo] = useState();

  const loadAgilCredentials = async (email, password) => {
    const response = await fetch("https://ubc.agiltelecom.com.br:8282/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ user: email, password: password }),
    });

    if (!response.ok)
      throw new Error(`Erro ao fazer login: ${response.status}`);

    const data = await response.json();
    const { user, firstName, lastName } = data;

    return { authType: "agil", user, firstName, lastName, email, password };
  };

  const loadManualCredentials = (fields) => {
    return {
      authType: "manual",
      extension: fields.extension,
      authId: fields.authId,
      domain: fields.domain,
      port: fields.port,
      password: fields.password,
      firstName: fields.firstName,
      lastName: fields.lastName,
    };
  };

  const saveCredentials = async (credentials) => {
    const key = await generateKey();
    const encryptedPassword = await encryptData(credentials.password, key);
    const exportedKey = await crypto.subtle.exportKey("raw", key);
    const keyBase64 = arrayBufferToBase64(exportedKey);

    localStorage.setItem("authType", credentials.authType);
    localStorage.setItem("encryptedPassword", encryptedPassword.encrypted);
    localStorage.setItem("passwordIV", encryptedPassword.iv); //QoNSoqrjA6
    localStorage.setItem("key", keyBase64);

    // Chave de API gerada com sucesso
    // 7V4GUXaVrEaMEA6E7s3zgTWrKZg6fTRz

    if (credentials.authType === "agil") {
      localStorage.setItem("userEmail", credentials.email);
      localStorage.setItem("firstName", credentials.firstName);
      localStorage.setItem("lastName", credentials.lastName);
      localStorage.setItem("user", credentials.user);
    } else if (credentials.authType === "manual") {
      localStorage.setItem("user", credentials.extension);
      localStorage.setItem("authId", credentials.authId); //QoNSoqrjA6
      localStorage.setItem("domain", credentials.domain);
      localStorage.setItem("port", credentials.port);
      localStorage.setItem("lastName", credentials.lastName);
      localStorage.setItem("firstName", credentials.firstName);
    }
  };

  const handleSubmitAgil = async (event) => {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    if (!email || !password) {
      setStatus("Preencha todos os campos!");
      return;
    }
    try {
      const agilCreds = await loadAgilCredentials(email, password);
      await saveCredentials(agilCreds);
      navigate("/agilphone");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  const handleSubmitManual = async (event) => {
    event.preventDefault();
    const form = event.target;
    const fields = {
      extension: form.extension.value,
      authId: form.authId.value,
      domain: form.domain.value,
      port: form.port.value,
      password: form.password.value,
      firstName: form.firstName.value,
      lastName: form.lastName.value,
    };
    if (Object.values(fields).some((val) => !val)) {
      setStatus("Preencha todos os campos do formulário manual!");
      return;
    }
    try {
      const manualCreds = loadManualCredentials(fields);
      await saveCredentials(manualCreds);
      navigate("/agilphone");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao salvar credenciais manuais.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="flex flex-col space-y-8">
        <h1 className="text-xl font-bold text-center">Escolha o Modo</h1>
        <button
          type="submit"
          className="bg-green-500 text-white p-2 rounded"
          onClick={() => setModo(!modo)}
        >
          {modo ? "Modo Manual" : "Modo Automático"}
        </button>

        {modo && (
          <form
            onSubmit={handleSubmitAgil}
            className="flex flex-col space-y-4 p-4 bg-white rounded shadow"
          >
            <h1 className="text-xl font-bold text-center">Login Agil</h1>
            <input
              className="p-2 border rounded"
              type="email"
              name="email"
              placeholder="E-mail"
            />
            <input
              className="p-2 border rounded"
              type="password"
              name="password"
              placeholder="Senha"
            />
            <button
              type="submit"
              className="bg-yellow-500 text-white p-2 rounded"
            >
              Entrar Agil
            </button>
          </form>
        )}

        {!modo && (
          <form
            onSubmit={handleSubmitManual}
            className="flex flex-col space-y-4 p-4 bg-white rounded shadow"
          >
            <h1 className="text-xl font-bold text-center">Login Manual</h1>
            <input
              className="p-2 border rounded"
              name="extension"
              placeholder="Número do Ramal"
            />
            <input
              className="p-2 border rounded"
              name="authId"
              placeholder="ID de Autenticação"
            />
            <input
              className="p-2 border rounded"
              name="domain"
              placeholder="Domínio do PBX"
            />
            <input
              className="p-2 border rounded"
              name="port"
              placeholder="Porta SIP"
            />
            <input
              className="p-2 border rounded"
              name="firstName"
              placeholder="Nome"
            />
            <input
              className="p-2 border rounded"
              name="lastName"
              placeholder="Sobre Nome"
            />
            <input
              className="p-2 border rounded"
              type="password"
              name="password"
              placeholder="Senha de Autenticação"
            />
            <button
              type="submit"
              className="bg-yellow-500 text-white p-2 rounded"
            >
              Entrar Manual
            </button>
          </form>
        )}

        <p className="text-center text-red-500">{status}</p>
      </div>
    </div>
  );
}

export default CredentialLoader;
