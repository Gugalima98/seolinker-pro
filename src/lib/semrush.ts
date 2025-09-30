export const getSemrushMetrics = async (apiKey: string) => {
  // Aqui será implementada a lógica para chamar a API do Semrush
  // e fazer o parsing da apiKey para obter as duas chaves.
  const [publicKey, privateKey] = apiKey.split(',');

  console.log('Semrush Public Key:', publicKey);
  console.log('Semrush Private Key:', privateKey);

  // Exemplo de chamada (substituir pela lógica real da API Semrush)
  // const response = await fetch(`https://api.semrush.com/some-endpoint?key=${publicKey}&another_key=${privateKey}`);
  // const data = await response.json();
  // return data;

  return { message: "Semrush metrics placeholder", publicKey, privateKey };
};
