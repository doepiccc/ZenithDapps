<div align="center">

# Zenith Apps

### Ten useful consumer dApps for Zenith EVM Testnet

React 19 · TypeScript · ethers v6 · Solidity 0.8.30 · static-first

</div>

Zenith Apps is a testnet app layer for everyday payments, streaming finance and digital assets. The site is fully static: wallet state, temporary secrets and demo UI state stay in the browser, while production actions are verified by contracts on Zenith EVM.

> Testnet only. ZTH and zUSDC have no real-world value. This is an independent project by [doepic.cc](https://doepic.cc), not an official Zenith Network product.

## Applications

| Category | Apps |
| --- | --- |
| Payments & social | ZenLink, SplitZen, PactFi, SafeDeal P2P |
| High-speed finance | MicroRetail RWA, SubStream, FlashPredict |
| Assets & safety | FairTix, OnChain Gumroad, DeadMan's Vault |

Every app has a usable interface demo before deployment. Once `public/deployments/zenith-testnet.json` contains an address, the same UI automatically switches to onchain mode.

## Contract suite

The suite compiles 13 deployable contracts:

- `ZenithSuiteRegistry` and `DemoUSDC` infrastructure;
- `EscrowVault`, `HabitPool`, `GroupTab`, `SafeDealP2P`;
- `MockTBondVault`, `SubStream`, `DemoPriceOracle`, `FlashPredict`;
- `FairTix`, `DeadMansVault`, `DigitalShop`.

The contracts use checks-effects-interactions, reentrancy locks, safe ERC-20 calls, expiry checks and low-s ECDSA recovery. Demo-only behavior is explicitly isolated (accelerated yield, time warp, test oracle and bot counterparty).

## Local development

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Checks and production build:

```bash
npm test
npm run lint
npm run build:pages
```

`npm run contracts:compile` writes full deployment artifacts to `artifacts/contracts/` and frontend ABIs to `src/generated/contracts.ts`.

## Deployment workflow

1. Open `ZenithControlPan` and configure a testnet deployer.
2. Fund it with testnet ZTH.
3. Run **Deploy full suite**; dependencies are deployed in catalog order.
4. Run **Bootstrap demo data** to authorize vault yield, fund the SafeDeal bot, seed events/products and populate the registry.
5. Use **Sync ZenithDapps** to write the addresses into this project's deployment manifest.
6. Rebuild the static site.

Network configuration:

| Parameter | Value |
| --- | --- |
| RPC | `https://rpc.testnet.zenith.network/` |
| Chain ID | `936485` (`0xe4a25`) |
| Explorer | `https://explorer.testnet.zenith.network/` |
| Native token | ZTH |

## Parent Pages integration

The repository includes a composite `action.yml`. A parent Pages workflow can build it as a submodule:

```yaml
- uses: ./zenith
  with:
    output-directory: site-dist/zenith
    node-version: '22'
```

Assets and hash routes are relative, so the build works at `/zenith/`. `DoEpicCCWeb` routes `zenith.doepic.cc` to that static application.

## Secret handling

- ZenLink ephemeral private keys live only in the URL fragment and React memory.
- The frontend never requests wallet seed phrases or private keys.
- Deployment owner keys belong in Zenith Control Panel, where Electron encrypts them with the operating system.
- DigitalShop stores purchase proofs and content commitments, not plaintext paid files.
