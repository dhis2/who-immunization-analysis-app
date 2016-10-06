(function() {

	var app = angular.module('epiApp');

	app.directive('d2SelectIndicator', function () {
		return {
			scope: {
				'ngModel': '=',
				'dataset': '=',
				'multiple': '=',
				'onSelect': '&'
			},
			bindToController: true,
			controller: "d2SelectIController",
			controllerAs: 'd2sCtrl',
			templateUrl: 'appCommons/d2SelectIndicator.html'
		};
	});

	app.controller("d2SelectIController",
		['d2Meta', 'd2Utils', '$scope',
			function(d2Meta, d2Utils, $scope) {
				var self = this;

				self.groups = [];
				self.group;
				self.elements = [];
				self.element;
				self.disaggregation = 0;

				self.placeholder = "Select indicator...";

				self.getElements = getElements;

				function init() {

					//Get groups
					var object = 'indicatorGroups';
					d2Meta.objects(object).then(
						function(data) {
							self.groups = data;
						}
					);


					//Start looking for changes in selected elements
					$scope.$watchCollection(watchElement, function (newVal, oldVal) {
						if (newVal === oldVal) return;

						//Check if "all" is included
						if (self.multiple) {
							var currentModel = [];
							for (var i = 0; i < self.element.length; i++) {
								if (self.element[i].id === 'all') {
									d2Utils.arrayMerge(currentModel, self.element[i].elements);
								}
								else {
									currentModel.push(self.element[i]);
								}
							}
							currentModel = d2Utils.arrayRemoveDuplicates(currentModel, 'id');
							self.ngModel = currentModel;
						}
						else {
							self.ngModel = self.element;
						}

						self.onSelect({'object': self.ngModel});

					});



				}


				function getElements() {
					if (!self.group) return;

					self.placeholder = "Loading...";


					var fields = 'indicators[displayName,id]';
					var object = 'indicatorGroups';
					d2Meta.object(object, self.group.id, fields).then(function(data) {saveElements(data.indicators);});


				}


				function saveElements(data) {
					if (data.length === 0) self.placeholder = "No indicators in " + self.group.name;
					else self.placeholder = "Select indicator...";

					if (self.multiple) filterElements(data);
					d2Utils.arraySortByProperty(data, 'displayName', false);

					if (self.multiple != undefined && self.multiple) {
						data.unshift({
							displayName: '[All indicators]',
							id: 'all',
							group: self.group.id,
							elements: angular.copy(data)
						});
					}

					self.elements = data;
				}


				function filterElements(data) {
					for (var i = 0; i < data.length; i++) {
						for (var j = 0; self.element && j < self.element.length; j++) {

							var remove = false;
							if (data[i].id === self.element[j].id) {
								if (data[i].id === 'all') {
									if (data.group === self.element[j].group) {
										remove = true;
									}
								}
								else {
									remove = true;
								}
							}
							if (remove) data.splice(i, 1);
						}

					}
				}


				function watchElement() {
					if (self.multiple) {
						if (!self.element) {
							return null;
						}
						return self.element.length;
					}
					else {
						if (!self.element) {
							return null;
						}
						return self.element.id;
					}
				}


				init();


				return self;
			}]);

})();