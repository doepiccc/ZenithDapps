import { ChevronDown, LoaderCircle, LogOut, WalletCards, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../lib/errors'
import { shortAddress } from '../lib/network'
import { useToast } from '../context/ToastContext'
import { useWallet } from '../context/WalletContext'

export function WalletButton() {
  const wallet = useWallet()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)

  const connect = async () => {
    try {
      await wallet.connect()
      notify('success', 'Кошелёк подключён', 'Zenith EVM Testnet готов к работе.')
    } catch (error) {
      notify('error', 'Не удалось подключить кошелёк', errorMessage(error))
    }
  }

  if (!wallet.account) {
    return (
      <button className="wallet-button" type="button" onClick={() => void connect()} disabled={wallet.connecting}>
        {wallet.connecting ? <LoaderCircle className="spin" /> : <WalletCards />}
        <span>{wallet.available ? 'Подключить' : 'Нет кошелька'}</span>
      </button>
    )
  }

  return (
    <div className="wallet-menu">
      <button className={`wallet-button wallet-button--connected ${!wallet.correctNetwork ? 'is-wrong' : ''}`} type="button" onClick={() => setOpen((value) => !value)}>
        <i />
        <span>{shortAddress(wallet.account)}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="wallet-popover">
          <div className="wallet-popover__account">
            <span><WalletCards /></span>
            <div><strong>{shortAddress(wallet.account, 10, 6)}</strong><small>{wallet.balance ? `${Number(wallet.balance).toFixed(3)} ZTH` : 'Баланс загружается'}</small></div>
          </div>
          {!wallet.correctNetwork && (
            <button type="button" onClick={() => void wallet.switchToZenith().catch((error) => notify('error', 'Сеть не переключена', errorMessage(error)))}>
              <WifiOff /> Переключить на Zenith
            </button>
          )}
          <button type="button" onClick={() => { wallet.disconnect(); setOpen(false) }}><LogOut /> Отключить локально</button>
        </div>
      )}
    </div>
  )
}
