import React from 'react';
import { WalletType, Wallet } from '../types';
import { Building2, Smartphone, Coins, Wallet as WalletIcon } from 'lucide-react';

const LOGO_MAP: Record<string, string> = {
  'stockbit': 'https://thewealthmosaic.s3.amazonaws.com/media/Logo_Stockbit.png',
  'seabank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/SeaBank.svg/330px-SeaBank.svg.png',
  'allobank': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Allo_Bank_logo.png',
  'bca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/330px-Bank_Central_Asia.svg.png',
  'makmur': 'https://star-am.com/wp-content/uploads/2023/10/new-logo-makmur.png'
};

interface WalletLogoProps {
  wallet: Wallet | Partial<Wallet>;
  size?: number;
  className?: string;
}

export const WalletLogo: React.FC<WalletLogoProps> = ({ wallet, size = 20, className = '' }) => {
  const name = (wallet?.name || '').toLowerCase().replace(/\s+/g, '');
  let logoUrl = null;
  
  for (const [key, url] of Object.entries(LOGO_MAP)) {
    if (name.includes(key)) {
      logoUrl = url;
      break;
    }
  }

  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={wallet.name || 'Wallet Logo'} 
        style={{ width: size, height: size, objectFit: 'contain' }} 
        className={className}
      />
    );
  }

  if (wallet.type === WalletType.BANK) return <Building2 size={size} className={className} />;
  if (wallet.type === WalletType.EWALLET) return <Smartphone size={size} className={className} />;
  if (wallet.type === WalletType.CASH) return <Coins size={size} className={className} />;
  return <WalletIcon size={size} className={className} />;
};
