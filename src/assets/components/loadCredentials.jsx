// Converte uma string Base64 para ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64); // Decodifica a base64 em uma string binária
  const len = binaryString.length;
  const arrayBuffer = new ArrayBuffer(len);
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < len; i++) {
    view[i] = binaryString.charCodeAt(i); // Preenche o ArrayBuffer com os valores da string binária
  }
  return arrayBuffer;
}

// Função para descriptografar os dados usando AES-GCM
async function decryptData(encryptedData, ivBase64, key) {
  try {
    // Converte o IV Base64 para ArrayBuffer
    const iv = base64ToArrayBuffer(ivBase64);

    // Converte os dados criptografados de Base64 para ArrayBuffer
    const encryptedArrayBuffer = base64ToArrayBuffer(encryptedData);

    // Descriptografa os dados
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedArrayBuffer
    );

    // Converte o ArrayBuffer resultante para string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Erro ao descriptografar dados:", error);
    throw new Error("Descriptografia falhou.");
  }
}

// loadCredentials.jsx
export async function loadCredentials() {
  try {
    const email = localStorage.getItem("userEmail");
    const encryptedPassword = localStorage.getItem("encryptedPassword");
    const passwordIV = localStorage.getItem("passwordIV");
    const keyBase64 = localStorage.getItem("key");
    const lastName = localStorage.getItem("lastName");
    const firstName = localStorage.getItem("firstName");
    const user = localStorage.getItem("user");

    // Verifica se os dados necessários estão no localStorage
    if (!email || !encryptedPassword || !passwordIV || !keyBase64) {
      console.warn("⚠️ Credenciais incompletas no localStorage.");
      return null;
    }

    // Converte a chave Base64 de volta para ArrayBuffer
    const keyBuffer = base64ToArrayBuffer(keyBase64);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    // Descriptografa a senha
    const decryptedPassword = await decryptData(
      encryptedPassword,
      passwordIV,
      key
    );

    // Armazena os valores em variáveis globais ou no estado
    return {
      ramal: user,
      firstName,
      lastName,
      password: decryptedPassword,
    };
  } catch (error) {
    console.error("❌ Erro ao carregar credenciais SIP:", error);
    return null;
  }
}
