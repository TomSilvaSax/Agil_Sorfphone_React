import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Converte ArrayBuffer para Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Função para gerar chave criptográfica
async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

// Função para criptografar dados
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

  // Função para realizar o login
  const loadCredentials = async (email, password) => {
    try {
      if (!email || !password) {
        setStatus("Preencha todos os campos!");
        return;
      }

      // Envia dados de login
      const response = await fetch(
        "https://ubc.agiltelecom.com.br:8282/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ user: email, password: password }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao fazer login: ${response.status}`);
      }

      const data = await response.json();
      const { user, firstName, lastName } = data;

      // Criptografa e salva credenciais
      const key = await generateKey();
      const encryptedPassword = await encryptData(password, key);

      const exportedKey = await crypto.subtle.exportKey("raw", key);
      const keyBase64 = arrayBufferToBase64(exportedKey);

      // Salva credenciais no localStorage
      localStorage.setItem("userEmail", email);
      localStorage.setItem("encryptedPassword", encryptedPassword.encrypted);
      localStorage.setItem("passwordIV", encryptedPassword.iv);
      localStorage.setItem("key", keyBase64);
      localStorage.setItem("firstName", firstName);
      localStorage.setItem("lastName", lastName);
      localStorage.setItem("user", user);

      navigate("/agilphone");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setStatus("Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  // Efeito para verificar se há credenciais no localStorage ao montar o componente
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    const storedEncryptedPassword = localStorage.getItem("encryptedPassword");
    const storedPasswordIV = localStorage.getItem("passwordIV");
    const storedKey = localStorage.getItem("key");

    if (
      storedEmail &&
      storedEncryptedPassword &&
      storedPasswordIV &&
      storedKey
    ) {
      setStatus("Credenciais encontradas. Realizando login...");
      navigate("/agilphone");
    }
  }, [navigate]);

  // Manipulador de submit do formulário
  const handleSubmit = (event) => {
    event.preventDefault();

    const email = event.target.email.value;
    const password = event.target.password.value;
    loadCredentials(email, password);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold text-center mb-4">Login</h1>
        <input
          className="w-full p-2 border border-gray-300 rounded text-sm"
          type="email"
          name="email"
          placeholder="E-mail"
        />
        <input
          className="w-full p-2 border border-gray-300 rounded text-sm"
          type="password"
          name="password"
          placeholder="Senha"
        />
        <button
          type="submit"
          className="bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Entrar
        </button>
        <p id="status">{status}</p>
      </form>
    </div>
  );
}

export default CredentialLoader;
