import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Função para salvar um cookie
function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Define o cookie para ser acessível em todo o site, com segurança
  document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax; Secure";
}

const ReferralHandler = () => {
  const { affiliateCode } = useParams<{ affiliateCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (affiliateCode) {
      // Salva o código de afiliado em um cookie por 30 dias
      console.log(`Affiliate code "${affiliateCode}" captured. Setting cookie.`);
      setCookie('affiliate_code', affiliateCode, 30);
      // Redireciona para a página de preços, um fluxo comum para afiliados
      navigate('/pricing'); 
    } else {
      // Se não houver código, apenas redireciona
      navigate('/pricing');
    }
  }, [affiliateCode, navigate]);

  // Este componente não renderiza nada na tela
  return null; 
};

export default ReferralHandler;
