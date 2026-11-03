import '@fontsource-variable/manrope'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ContractsProvider } from './context/ContractsContext'
import { ToastProvider } from './context/ToastContext'
import { WalletProvider } from './context/WalletContext'
import { LocaleProvider } from './i18n/LocaleContext'
import { translations } from './i18n/translations'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider pairs={translations}>
      <ToastProvider>
        <WalletProvider>
          <ContractsProvider>
            <App />
          </ContractsProvider>
        </WalletProvider>
      </ToastProvider>
    </LocaleProvider>
  </StrictMode>,
)
