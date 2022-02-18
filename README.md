# Wallet Withdrawal

## Configuration

- File location `src/helpers/config.ts`
- Lists supported chains that are loaded dynamically when selecting.
- `wallet_address` and `wallet_abi` (ABI) of Wallet Smart Contract that loads dynamicly when selecting chain
- `token_address` and `token_abi` (ABI) of Token X that is used for transactions on the selected chain
- Variables like `chain_id`, `name`, `rpc_url`, `native_currency.name`, `native_currency.symbol`, `native_currency.decimals` should be handled with great care since they are used when switching/adding networks on Metamask.

## Logic

- On init app checks to see if there is a cached web3 provider, if so - auto connects Metamask.
- If there is no cached web3 provider then there will be a button to connect using Metamask.
- Upon successful metamask connection app will render all networks from configuration file, on click it will prompt metamask to change the Network. If network is not found on users Metamask then it will use configuration variables mentioned above to start a network addition process on user end in Metamask ( user has to proceed through confirmation windows manually to add said unknown network)
- App will try to get balance of the Token X if it is configured `getAccountAssets` ( if not the state.networkSupported will be false, this is the same case for Wallet configuarion if it's not set )
- User will be prompted to confirm withdrawal on Metamask `handleWithdrawal`.
- App will auto refresh on Network/Chain or Account change on Metamask.


## Error handling

- App should handle errors gracefully, any cancellation of Metamask confirmation screen will spawn en exception. As well as possible contract errors if network is overloaded or there are problems with gas fees.
- Please add any error state to your liking in `try{} catch (error) {}` blocks when there is interaction with metamask or your internal Wallet API


## TODO
- Withdrawal requires your internal identification of the user, in this case `withdrawal_id` was used. Please note the `call_api` Mock function which should be changed to your internal Wallet API call to get the user identifier. And if the amount of `state.withdrawalAmount` is available to withdraw ( this will prevent Smart Contract from throwing exceptions, always double check data before triggering Metamask since this will prevent unnecessary Smart Contract calls ). 
- Handle possible errors returned by your internal api in place of `call_api` Mock function
- Render errors based on errors caught in `try{} catch (error) {}` when using Metamask or your internal API


## Available React Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
