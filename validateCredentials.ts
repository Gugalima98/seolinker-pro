import { readFileSync } from 'fs';
import { parse } from 'csv-parse';

interface NetworkSite {
  api_url: string;
  username: string;
  application_password: string;
  [key: string]: string; // Allow other properties from CSV
}

async function validateCredentials() {
  const csvFilePath = './network_sites_to_import.csv';
  let records: NetworkSite[] = [];

  try {
    const fileContent = readFileSync(csvFilePath, { encoding: 'utf-8' });
    records = await new Promise((resolve, reject) => {
      parse(fileContent, { 
        columns: true, 
        skip_empty_lines: true 
      }, (err, output) => {
        if (err) return reject(err);
        resolve(output as NetworkSite[]);
      });
    });
  } catch (error) {
    console.error(`Erro ao ler ou analisar o arquivo CSV: ${error.message}`);
    return;
  }

  console.log(`Iniciando validação de ${records.length} sites...\n`);

  for (const site of records) {
    const { api_url, username, application_password } = site;

    if (!api_url || !username || !application_password) {
      console.log(`Site: ${api_url || 'N/A'} - Status: ERRO (Dados incompletos no CSV)`);
      continue;
    }

    let baseUrl = api_url;
    baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/wp-json\/wp\/v2$/, ''); // Remove /wp-json/wp/v2 if already there

    const testUrl = `${baseUrl}/wp-json/wp/v2/posts?per_page=1`; // Test a standard endpoint
    const authHeader = `Basic ${Buffer.from(`${username}:${application_password}`).toString('base64')}`;

    try {
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log(`Site: ${api_url} - Status: SUCESSO (Credenciais OK)`);
      } else if (response.status === 401) {
        console.log(`Site: ${api_url} - Status: FALHA (401 Unauthorized - Credenciais incorretas)`);
      } else if (response.status === 403) {
        console.log(`Site: ${api_url} - Status: FALHA (403 Forbidden - Permissão negada ou IP bloqueado)`);
      } else if (response.status === 404) {
        console.log(`Site: ${api_url} - Status: FALHA (404 Not Found - URL da API incorreta ou site não WordPress)`);
      } else {
        console.log(`Site: ${api_url} - Status: FALHA (${response.status} - ${response.statusText})`);
      }
    } catch (error) {
      console.log(`Site: ${api_url} - Status: ERRO (Conexão/DNS - ${error.message})`);
    }
  }

  console.log(`\nValidação concluída.`);
}

validateCredentials();
