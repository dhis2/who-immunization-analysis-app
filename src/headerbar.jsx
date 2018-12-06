import React from "react";
import ReactDOM from "react-dom";
import PropTypes from 'prop-types';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import theme from "./headerbar-theme.jsx";

import D2Library from 'd2/lib/d2';

import HeaderBarComponent from "d2-ui/lib/app-header/HeaderBar";
import headerBarStore$ from "d2-ui/lib/app-header/headerBar.store";
import withStateFrom from "d2-ui/lib/component-helpers/withStateFrom";

const dhisConfig = DHIS_CONFIG; // eslint-disable-line

let HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

class HeaderBarWrapper extends React.Component {
    getChildContext() {
        return {
            d2: this.props.d2,
            muiTheme: theme,
        };
    }

    render() {
        return (
            <HeaderBar />
        );
    }
}
HeaderBarWrapper.childContextTypes = {
    d2: PropTypes.object,
    muiTheme: PropTypes.object,
};


export default function initHeaderBar(targetSelector){
    D2Library.getManifest('manifest.webapp')
    .then((manifest) => {
        const baseUrl = process.env.NODE_ENV === 'production' ? manifest.getBaseUrl() : dhisConfig.baseUrl;
        D2Library.config.baseUrl = `${baseUrl}/api`;
        //log.info(`Loading: ${manifest.name} v${manifest.version}`);
        //log.info(`Built ${manifest.manifest_generated_at}`);
    })
    .then(D2Library.getUserSettings)
    .then((settings) => {})
    .then(D2Library.init)
    .then((d2) =>  {
        console.log("D2 initialized", d2);
        ReactDOM.render(<MuiThemeProvider><HeaderBarWrapper d2={d2} /></MuiThemeProvider>, document.querySelector(targetSelector));
    })
};