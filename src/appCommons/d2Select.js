(function() {

	var app = angular.module('epiApp');

	app.directive('d2Select', function () {
		return {
			scope: {
				'ngModel': '=',
				'options': '=',
				'multiple': '=',
				'ngDisabled': '=',
				'placeholder': '@',
				'onSelect': '&'
			},
			bindToController: true,
			controller: "d2SelectController",
			controllerAs: 'd2sCtrl',
			templateUrl: 'appCommons/d2Select.html'
		};
	});

	app.controller("d2SelectController",
		[
			function() {
				var self = this;

				return self;
			}]);

})();