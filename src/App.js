import { sanitizeUrl } from "@braintree/sanitize-url";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui";
import "@near-wallet-selector/modal-ui/styles.css";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupNeth } from "@near-wallet-selector/neth";
import { setupSender } from "@near-wallet-selector/sender";
import "App.scss";
import Big from "big.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle";
import "error-polyfill";
import {
  EthersProviderContext,
  useAccount,
  useInitNear,
  useNear,
  utils,
} from "near-social-vm";
import React, { useCallback, useEffect, useState } from "react";
import "react-bootstrap-typeahead/css/Typeahead.bs5.css";
import "react-bootstrap-typeahead/css/Typeahead.css";
import { Link, Route, BrowserRouter as Router, Switch } from "react-router-dom";
import { BosLoaderBanner } from "./components/BosLoaderBanner";
import { ActionButton } from "./components/common/buttons/ActionButton";
import { Camera } from "./components/custom/Camera";
import { KeypomScanner } from "./components/custom/KeypomScanner";
import { MonacoEditor } from "./components/custom/MonacoEditor";
import { NavigationWrapper } from "./components/navigation/NavigationWrapper";
import { useEthersProviderContext } from "./data/web3";
import { NetworkId, Widgets } from "./data/widgets";
import { useBosLoaderInitializer } from "./hooks/useBosLoaderInitializer";
import Flags from "./pages/Flags";
import ViewPage from "./pages/ViewPage";
import Footer from "./components/navigation/Footer";

export const refreshAllowanceObj = {};
const documentationHref = "https://social.near-docs.io/";

function App(props) {
  const [connected, setConnected] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [signedAccountId, setSignedAccountId] = useState(null);
  const [availableStorage, setAvailableStorage] = useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [widgetSrc, setWidgetSrc] = useState(null);

  const ethersProviderContext = useEthersProviderContext();
  useBosLoaderInitializer();

  const { initNear } = useInitNear();
  const near = useNear();
  const account = useAccount();
  const accountId = account.accountId;

  const location = window.location;

  useEffect(() => {
    initNear &&
      initNear({
        networkId: NetworkId,
        selector: setupWalletSelector({
          network: NetworkId,
          modules: [
            setupNearWallet(),
            setupMyNearWallet(),
            setupSender(),
            setupHereWallet(),
            setupMeteorWallet(),
            setupNeth({
              gas: "300000000000000",
              bundle: false,
            }),
          ],
        }),
        customElements: {
          Link: (props) => {
            if (!props.to && props.href) {
              props.to = props.href;
              delete props.href;
            }
            if (props.to) {
              props.to = sanitizeUrl(props.to);
            }
            return <Link {...props} />;
          },
          KeypomScanner: (props) => {
            return <KeypomScanner {...props} />;
          },
          Camera: (props) => {
            return <Camera {...props} />;
          },
          MonacoEditor: (props) => {
            return <MonacoEditor {...props} />;
          },
        },
      });
  }, [initNear]);

  // useEffect(() => {
  //   if (
  //     !location.search.includes("?account_id") &&
  //     !location.search.includes("&account_id") &&
  //     (location.search || location.href.includes("/?#"))
  //   ) {
  //     window.history.replaceState({}, "/", "/" + location.hash);
  //   }
  // }, [location]);

  useEffect(() => {
    if (!near) {
      return;
    }
    near.selector.then((selector) => {
      setWalletModal(
        setupModal(selector, { contractId: near.config.contractName })
      );
    });
  }, [near]);

  const requestSignIn = useCallback(
    (e) => {
      e && e.preventDefault();
      walletModal.show();
      return false;
    },
    [walletModal]
  );

  const logOut = useCallback(async () => {
    if (!near) {
      return;
    }
    const wallet = await (await near.selector).wallet();
    wallet.signOut();
    near.accountId = null;
    setSignedIn(false);
    setSignedAccountId(null);
  }, [near]);

  const refreshAllowance = useCallback(async () => {
    alert(
      "You're out of access key allowance. Need sign in again to refresh it"
    );
    await logOut();
    requestSignIn();
  }, [logOut, requestSignIn]);
  refreshAllowanceObj.refreshAllowance = refreshAllowance;

  useEffect(() => {
    if (!near) {
      return;
    }
    setSignedIn(!!accountId);
    setSignedAccountId(accountId);
    setConnected(true);
  }, [near, accountId]);

  useEffect(() => {
    setAvailableStorage(
      account.storageBalance
        ? Big(account.storageBalance.available).div(utils.StorageCostPerByte)
        : Big(0)
    );
  }, [account]);

  const passProps = {
    refreshAllowance: () => refreshAllowance(),
    setWidgetSrc,
    signedAccountId,
    signedIn,
    connected,
    availableStorage,
    widgetSrc,
    logOut,
    requestSignIn,
    widgets: Widgets,
    documentationHref,
  };

  return (
    <div className="App">
      <EthersProviderContext.Provider value={ethersProviderContext}>
        <Router basename={process.env.PUBLIC_URL}>
          <Switch>
            <Route path={"/flags"}>
              <Flags {...passProps} />
            </Route>
            <Route path={"/scanner"}>
              <NavigationWrapper {...passProps} />
              <KeypomScanner />
            </Route>
            <Route path={"/create"}>
              <ViewPage overrideSrc={passProps.widgets.create} {...passProps} />
              <Footer {...passProps} />
            </Route>
            <Route path={"/:widgetSrc*"}>
              <BosLoaderBanner />
              {/* <NavigationWrapper {...passProps} /> */}
              <ViewPage {...passProps} />
              <Footer {...passProps} />
              <ActionButton {...passProps} />
            </Route>
          </Switch>
        </Router>
      </EthersProviderContext.Provider>
    </div>
  );
}

export default App;
