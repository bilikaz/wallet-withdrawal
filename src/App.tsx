import React, { Component, Fragment } from 'react';
import Web3 from "web3";
import Web3Modal from "web3modal";
import { getChainData } from "./helpers/utilities";
import supportedChains from "./helpers/config";
import './App.css';

interface AppState {
  subscribeProvider: boolean
  fetching: boolean
  address: string
  chainBalance: string
  balance: string
  web3: any
  provider: any
  connected: boolean
  chainId: number
  networkId: number
  networkSupported: boolean
  pendingWithdrawal: boolean
  withdrawalAmount: number
  withdrawalAddress: string
  validWithdrawalAddress: boolean
}

const INITIAL_STATE: AppState = {
  subscribeProvider: true,
  fetching: false,
  address: "",
  chainBalance: "0",
  balance: "0",
  web3: null,
  provider: null,
  connected: false,
  chainId: 1,
  networkId: 1,
  networkSupported: false,
  pendingWithdrawal: false,
  withdrawalAmount: 0,
  withdrawalAddress: "",
  validWithdrawalAddress: false,
}

class App extends Component { 

  public  web3Modal: Web3Modal
  public  state: AppState
  private contract: any
  private token: any

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions: {}
    });
  }

  componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.connectWallet();
    }
  }

  connectWallet = async () => {
    const provider = await this.web3Modal.connect()
    await this.subscribeProvider(provider)
    await provider.enable()
    const web3: any = new Web3(provider)
    await this.setState({
      web3,
      provider,
      connected: true,
    });
    this.onConnect();
  }

  onConnect = async () => {
    const { web3 } = this.state;
    const accounts = await web3.eth.getAccounts()
    const address = accounts[0]
    const networkId = await web3.eth.net.getId()
    const chainId = await web3.eth.getChainId()
    const chainData = getChainData(chainId)
    const networkSupported = !!chainData.wallet_address.length && (chainData.use_native_currency || !!chainData.token_address.length)
    if ( await web3.eth.net.isListening() && networkSupported ) {
      this.contract =
        new web3.eth.Contract(
          chainData.wallet_abi,
          chainData.wallet_address
        )
      if ( !!chainData.token_address.length ) {
        this.token =
          new web3.eth.Contract(
            chainData.token_abi,
            chainData.token_address
          )
      }
    } else {
      this.contract = {}
      this.token = {}
    }
    await this.setState({
      address,
      chainId,
      networkId,
      networkSupported
    });
    await this.getAccountAssets();
  };

  public resetApp = async () => {
    const { web3 } = this.state;
    if (web3 && web3.currentProvider && web3.currentProvider.close) {
      await web3.currentProvider.close();
    }
    await this.web3Modal.clearCachedProvider();
    this.setState({ ...INITIAL_STATE, subscribeProvider: false })
  }

  public subscribeProvider = async (provider: any) => {
    const { subscribeProvider } = this.state;
    
    if (!provider.on || !subscribeProvider) { return }

    provider.on("close", () => this.resetApp())
    provider.on("accountsChanged", () => this.onConnect())
    provider.on("chainChanged", () => this.onConnect())

    await this.setState({
      subscribeProvider : false
    });
  };

  public async switchNetwork(chainId: number) {
    const { web3 } = this.state;
    let chainData: any
    
    try {
      chainData = getChainData(chainId)
    } catch (error:any) {
      this.resetApp()
      return
    }
    
    try {
      await (web3.currentProvider! as any).request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: web3.utils.toHex(chainData.chain_id) }],
      });
    } catch (error:any) {
      if (error.code === 4902) {
        try {
          await (web3.currentProvider! as any).request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: web3.utils.toHex(chainData.chain_id),
                chainName: chainData.name,
                rpcUrls: [chainData.rpc_url],
                nativeCurrency: {
                  name: chainData.native_currency.name,
                  symbol: chainData.native_currency.symbol,
                  decimals: Number(chainData.native_currency.decimals),
                }
              },
            ],
          });
        } catch (error:any) {
          alert('Unable to add new network: '+chainData.name+'. Please try to add this network manually.')
          console.log(error.message)
        }
      }
    }
  }

  public getAccountAssets = async () => {
    const { web3, address, chainId, networkSupported } = this.state;
    const chainData = getChainData(chainId)
    this.setState({ fetching: true })
    if ( networkSupported && !chainData.use_native_currency ) {
      try {
        await this.token.methods.balanceOf(address).call().then( async (balance: string) => {
          await this.setState({ 
            fetching: false, 
            balance: web3.utils.fromWei(balance, 'ether')
          })
        } )
      } catch (error) {
        console.error(error);
        await this.setState({ fetching: false })
      }
    } else {
      await this.setState({ balance: "0" })
    }
    web3.eth.getBalance(address).then( (balance: any) => {
      this.setState({ chainBalance: web3.utils.fromWei(balance, 'ether') })
    } )
  }

  public async handleWithdrawalChanged(event:any) {
    await this.setState({
      withdrawalAmount: Number(event.target.value),
    });
  }

  public async handleWithdrawalAddressChanged(event:any) {
    const { web3 } = this.state;
    await this.setState({
      withdrawalAddress: String(event.target.value),
      validWithdrawalAddress: web3.utils.isAddress(event.target.value)
    });
  }

  public async toggleSubmit() {
    this.setState({ pendingWithdrawal: !this.state.pendingWithdrawal })
  }

  public async handleWithdrawal() {
    const { web3, address, chainId, networkSupported, withdrawalAddress, validWithdrawalAddress } = this.state;
    const chainData = getChainData(chainId)
    if( networkSupported && validWithdrawalAddress ) {
      try {
        this.setState({ fetching: true });
        // Call internal API to get user identifier (e.g. withdrawal_id)
        // This mockup expects withdrawal_id returned if funds are available with number greater than 0
        // If API returns 0 this would mean the funds are not available
        // Please edit validation logic to your liking
        // Only a mockup here
        const call_api = async (): Promise<number> => {
          return new Promise<number>((resolve) => {
            resolve(Math.round(Date.now() / 1000))
          })
        }
        call_api().then(async (withdrawal_id: number) => {
          if ( withdrawal_id > 0 ) {
            await this.contract.methods.request(
              withdrawal_id,
              withdrawalAddress,
              web3.utils.toWei(String(this.state.withdrawalAmount), 'ether')
            ).send({from: address})
            // Set some success state here
            this.setState({ 
              fetching: false,
              withdrawalAmount: 0
            })
          } else {
            // Set some Error message here
            console.log('API RETURNED INSUFICIENT FUNDS')
            this.setState({})
          }
        } )
      } catch (error) {
        console.error(error);
        // Set some Error message here
        await this.setState({ fetching: false });
      }
      await this.getAccountAssets()
    }
    
  }

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching,
      pendingWithdrawal,
      withdrawalAmount,
      withdrawalAddress,
      networkSupported,
      balance,
      chainBalance,
    } = this.state;

    const chainData = getChainData(chainId)

    const renderWalletButton = (
      connected ? (
        <button value="" onClick={this.resetApp}>Disconnect Metamask</button>
      ) : (
        <button value="" onClick={this.connectWallet}>Connect Metamask</button>
      )
    )

    const renderFormButton = (
      pendingWithdrawal ? (
        <Fragment>
          <button onClick={()=>this.toggleSubmit()}>Back</button>
          <button onClick={()=>this.handleWithdrawal()}>Submit</button> 
        </Fragment>
      ) : (
       <button onClick={()=>this.toggleSubmit()}>Next</button>  
      )
    )

    const renderFormInput = (
      pendingWithdrawal ? (
        <div>
          Chain: {chainData.chain} <br/>
          Amount: {withdrawalAmount} <br/>
          Address: {withdrawalAddress} <br/>
        </div>
      ) : (
        <Fragment>
          <input type="number" value={withdrawalAmount} onChange={this.handleWithdrawalChanged.bind(this)}/>
          <input type="text" value={withdrawalAddress} onChange={this.handleWithdrawalAddressChanged.bind(this)}/>
        </Fragment>
      )
    )

    const renderChains = supportedChains.map(chain => (
      <button className={`chainbutton ${chainId == chain.chain_id ? "active" : ""}`} value="" onClick={()=>this.switchNetwork(chain.chain_id)}>{chain.name}</button>
    ))

    return (
      <div className="App">
        {renderWalletButton}<br/><br/>
        {connected && renderChains}
        <div>
          {networkSupported
            ? <div>
                <span>Network supported.</span><br/>
                <span>Contract address: {chainData.wallet_address}</span><br/>
                {!chainData.use_native_currency &&
                  <Fragment>
                    <span>Token address: {chainData.token_address}</span><br/>
                    <span>Token balance: {balance}</span><br/>
                  </Fragment> 
                }
                <span>Withdrawal fee: {chainData.withdraw_fee}</span><br/>
              </div>
            : <div>
                <span>Network unsupported.</span><br/>
              </div>
          }
        </div>
        { (networkSupported && connected) && renderFormInput }
        { (networkSupported && connected) && renderFormButton }
      </div>
    )
  }
}

export default App;
