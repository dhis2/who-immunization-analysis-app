"use strict";

const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
require("colors");


const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config`;
var dhisConfig;
try {
	dhisConfig = require(dhisConfigPath); // eslint-disable-line
} catch (e) {
    // Failed to load config file - use default config
    console.warn("\nWARNING! Failed to load DHIS config:", e.message);
    dhisConfig = {
        baseUrl: "http://localhost:8080/dhis",
        authorization: "Basic YWRtaW46ZGlzdHJpY3Q=", // admin:district
    };
}

const devServerPort = 8081;
const isDevBuild = process.argv[1].indexOf("webpack-dev-server") !== -1;

const webpackConfig = {
    context: __dirname,
    entry: "./src/app.js",
    devtool: "source-map",
    output: {
        path: __dirname + "/build",
        filename: "[name]-[hash].js",
        publicPath: isDevBuild ? "http://localhost:8081/" : "./"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: "style-loader!css-loader",
            },
            {
                test: /\.scss$/,
                loader: "style-loader!css-loader!sass-loader",
            },
            {
                test: /\.html$/,
                loader: "html-loader"
            },
            {
                test: /\.png$/,
                loader: "url-loader?limit=100000"
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader?limit=10000&mimetype=application/font-woff"
            },
            {
                test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
                loader: "file-loader"
            },
            {
                test: /\.jsx?$/,
                loader: "babel-loader",
                exclude: /node_modules/,
                query: {
                    presets: ["react", "es2015"]
                }
            },
            {
                test: require.resolve("file-saver"),
                use:[
                    {
                        loader: "expose-loader",
                        options: "FileSaver"
                    }
                ]
            }
        ]
    },
    resolve: {
        alias: {}
    },
    plugins: [
        new HTMLWebpackPlugin({
            template: "src/index.ejs"
        }),
        new CopyWebpackPlugin([
            {from: "./src/css", to: "css"},
            {from: "./src/data", to: "data"},
            {from: "./src/img", to: "img"}
        ]),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery"
        }),
        !isDevBuild ? undefined : new webpack.DefinePlugin({
            DHIS_CONFIG: JSON.stringify(dhisConfig),
        }),
        isDevBuild ? undefined : new webpack.DefinePlugin({
            "process.env.NODE_ENV": "\"production\"",
            DHIS_CONFIG: JSON.stringify({}),
        }),
        isDevBuild ? undefined : new webpack.optimize.OccurrenceOrderPlugin(),
    ].filter(v => v),
    devServer: {
        port: devServerPort,
        inline: true,
        compress: true
    }
};


module.exports = webpackConfig;
