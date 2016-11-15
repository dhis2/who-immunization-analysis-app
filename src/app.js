
(function(){
	var app = angular.module('epiApp',
	['smart-table', 'ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.select', 'd2HeaderBar', 'angularBootstrapNavTree', 'd2',
		'report']);

	var $q;
	/**Bootstrap*/
	angular.element(document).ready( 
		function() {
			var initInjector = angular.injector(['ng']);
			var $http = initInjector.get('$http');
			$q = initInjector.get('$q');

			$http.get('manifest.webapp').then(
				function(response) {
					window.dhis2 = window.dhis2 || {};
					dhis2.settings = dhis2.settings || {};

					var baseUrl = response.data.activities.dhis.href;

					//To make the dhis2 menu work, we need to use '' as base when running off root, or instance name otherwise
					var urlParts = baseUrl.split('/');
					dhis2.settings.baseUrl = urlParts.length > 3 ? urlParts[urlParts.length-1] : '';

					linkCss(baseUrl + "/dhis-web-commons/font-awesome/css/font-awesome.min.css", null);
					linkCss(baseUrl + "/dhis-web-commons/css/widgets.css", "screen");
					linkCss(baseUrl + "/dhis-web-commons/css/menu.css", "screen");
					linkCss(baseUrl + "/dhis-web-commons/css/print.css", "print");
					linkCss(baseUrl + "/dhis-web-commons/javascripts/angular/plugins/select.css", null);
					linkCss(baseUrl + "/dhis-web-commons/javascripts/angular/plugins/select2.css", null);

					var promises = [];
					promises.push(loadScript(baseUrl + "/dhis-web-commons/javascripts/dhis2/dhis2.translate.js"));
					promises.push(loadScript(baseUrl + "/dhis-web-commons/javascripts/dhis2/dhis2.menu.js"));
					promises.push(loadScript(baseUrl + "/dhis-web-commons/javascripts/dhis2/dhis2.menu.ui.js"));
					
					$q.all(promises).then(function(datas) {
						app.constant("BASE_URL", response.data.activities.dhis.href);
						angular.bootstrap(document, ['epiApp']);
					});



				}
			);
		}
	);

	/**Config*/
	app.config(['uiSelectConfig', function(uiSelectConfig) {
		uiSelectConfig.theme = 'bootstrap';
		uiSelectConfig.resetSearchInput = true;
	}]);
	
	app.config(['$routeProvider',
		function($routeProvider) {
			$routeProvider.
				when('/report', {
					templateUrl: 'report/report.html',
					controller: 'ReportController',
					controllerAs: 'rCtrl'
				}).
				otherwise({
					redirectTo: '/report'
				});
		}]
	);


	/**Controller: Navigation*/
	app.controller("NavigationController",
	['BASE_URL', '$location', '$window', 'notificationService',
	function(BASE_URL, $location, $window, notificationService) {
		var self = this;



		return self;
	}]);


	function linkCss(url, mediatype) {
		$('<link/>', {
			rel: 'stylesheet',
			type: 'text/css',
			href: url,
			media: mediatype
		}).appendTo('head');
	}


	function loadScript(url) {
		var deferred = $q.defer();

		$.getScript(url, function(result) {
			deferred.resolve(true);
		});

		return deferred.promise;
	}

})();


