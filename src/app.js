"use strict";

const dhisDevConfig = DHIS_CONFIG; // eslint-disable-line

//Already imported from dhis2-commons (for menu bar) 
//import $ from "jquery";

import "angular";
import "angular-animate";
import "angular-bootstrap-nav-tree";
import "angular-route";
import "angular-sanitize";
import "angular-ui-bootstrap";
import "angular-smart-table";
import "ui-select";

import "file-saver";
import "blob";

import i18next from "i18next";
import i18nextResources from "../i18n/resources";
import "ng-i18next";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap-theme.css";
import "angular-ui-bootstrap/dist/ui-bootstrap-csp.css";
import "angular-bootstrap-nav-tree/dist/abn_tree.css";
import "ui-select/dist/select.css";

import "chart.js";
import "chartjs-plugin-annotation";
import "chartjs-plugin-stacked100";
import "./libs/chartjsLineWithLine.js";

//Core services
import "./appCommons/appCommons.js";
import "./appCore/appService.js";
import "./appCore/d2.js";


//Modules
import "./report/report.js";
import "./report/charts/monitoringChart.js";
import "./report/charts/performanceChart.js";
import "./report/charts/performanceOrgunitSummaryChart.js";
import "./report/charts/performanceChartTimeSummary.js";

//CSS
import "./css/style.css";


var app = angular.module("epiApp",
	["smart-table", "ngAnimate", "ngSanitize", "ngRoute", "ui.bootstrap", "ui.select", "angularBootstrapNavTree", "d2",
		"report", "appService", "appCommons", "jm.i18next"]);

/**Bootstrap*/
angular.element(document).ready( 
	function() {

		var initInjector = angular.injector(["ng"]);
		var $http = initInjector.get("$http");
		window.$q = initInjector.get("$q");

		$http.get("manifest.webapp").then(
			function(response) {
				window.dhis2 = window.dhis2 || {};
				window.dhis2.settings = window.dhis2.settings || {};
				
				//Not production => rely on webpack-dev-server proxy
				const baseUrl = process.env.NODE_ENV === "production" ? response.data.activities.dhis.href : "";
				app.constant("BASE_URL", baseUrl);
				app.constant("API_VERSION", "27");

				angular.bootstrap(document, ["epiApp"]);
			}
		);
		
		i18next
			.init({
				returnEmptyString: false,
				fallbackLng: false,
				keySeparator: "|",
				resources: i18nextResources
			});
		window.i18next = i18next;
	}
);

/**Config*/
app.config(["uiSelectConfig", function(uiSelectConfig) {
	uiSelectConfig.theme = "bootstrap";
	uiSelectConfig.resetSearchInput = true;
}]);

app.config(["$routeProvider",
	function($routeProvider) {
		$routeProvider.
			when("/report", {
				template: require("./report/report.html"),
				controller: "ReportController",
				controllerAs: "rCtrl"
			}).
			otherwise({
				redirectTo: "/report"
			});
	}]
);


/**Controller: Navigation*/
app.controller("NavigationController",
	["BASE_URL", "$location", "$window", "notificationService",
		function(BASE_URL, $location, $window, notificationService) {
			var self = this;



			return self;
		}]);


app.run(["BASE_URL", "$http", function(BASE_URL, $http) {
	$http.get( BASE_URL + "/api/me/profile.json").then(function (response) {
		if (response.data && response.data.settings && response.data.settings.keyUiLocale) {
			i18next.changeLanguage(response.data.settings.keyUiLocale);
		}
	});
}]);
