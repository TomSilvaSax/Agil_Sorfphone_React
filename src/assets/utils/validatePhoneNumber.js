export function validarNumeroTelefone(numero) {
  const numerosEspeciais = {
    190: "Polícia Militar",
    192: "SAMU",
    193: "Bombeiros",
    191: "Polícia Rodoviária Federal",
    199: "Defesa Civil",
    180: "Atendimento à Mulher",
    181: "Disque-Denúncia",
    188: "Apoio Emocional - CVV",
    100: "Denúncias - Direitos Humanos",
    121: "Previdência Social - INSS",
    135: "Previdência Social - Benefícios do INSS",
    144: "Operadora de Celular - Atendimento",
    102: "Auxílio à Lista Telefônica",
    156: "Serviços Municipais",
    166: "Concessionária de Rodovias",
    1188: "DER - Departamento de Estradas de Rodagem",
    103: "Atendimento de Telefonia Fixa",
    105: "Atendimento de Telefonia Móvel",
    4004: "Atendimento Bancário Local",
    "0300": "Número Tarifado (Custo Local)",
    "0500": "Doações",
    "0800": "Ligação Gratuita (SAC)",
  };

  const num = numero.replace(/\D/g, "");
  const dddsValidos = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
    37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 64, 63,
    65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 87, 82, 83, 84, 85, 88, 86,
    89, 91, 93, 94, 92, 97, 95, 96, 98, 99,
  ];

  let numeroValido = false;
  let numeroFormatado = num;
  let DDD = true;

  // Formatação (independente de ser válido)
  if (num.length === 11 && num.charAt(2) === "9") {
    numeroFormatado = num.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (num.length === 10 && num.charAt(3) !== "9") {
    numeroFormatado = num.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (num.length === 9 && num.charAt(0) === "9") {
    numeroFormatado = num.replace(/(\d{5})(\d{4})/, "$1-$2");
  } else if (num.length === 8 && /^[2-8]/.test(num)) {
    numeroFormatado = num.replace(/(\d{4})(\d{4})/, "$1-$2");
  } else if (num.length === 4) {
    numeroFormatado = num;
  }

  // Verificação de número especial
  if (numerosEspeciais[num] || num.length === 4) {
    numeroValido = true;
  }
  // Verifica DDD se número é de telefone com DDD
  else if (num.length === 10 || num.length === 11) {
    const ddd = parseInt(num.substring(0, 2), 10);
    if (!dddsValidos.includes(ddd)) {
      DDD = false;
      numeroValido = false;
      console.log("DDD inválido:", ddd);
    } else {
      DDD = true;
      numeroValido = true;
    }
  }
  // Números locais sem DDD (8 ou 9 dígitos)
  else if (num.length === 8 || num.length === 9) {
    numeroValido = true;
  }

  return { numeroValido, numeroFormatado, DDD };
}
