(function(){

	angular.module('d2').factory('d2Map',
		['requestService', 'd2Meta', 'd2Utils', '$q',
			function (requestService, d2Meta, d2Utils, $q) {

				//Define factory API
				var service = {
					ready: ready,
					load: load,
					save: save,
					admin: admin,
					versionUpgrade: versionUpgrade,
					dhisVersion: dhisVersion,
					indicators: indicators,
					indicatorAddEdit: indicatorAddEdit,
					indicatorDelete: indicatorDelete,
					dropouts: dropout,
					dropoutAddEdit: dropoutAddEdit,
					dropoutDelete: dropoutDelete,
					performance: performance,
					performanceAddEdit: performanceAddEdit,
					performanceDelete: performanceDelete,
					d2NameFromID: d2NameFromID
				};


				var _ready = false;
				var _map;
				var _d2Objects = {};
				var _dataIDs;
				var _version;

				/**
				 * Check if mapping is "ready", e.g. has been downloaded from server
				 *
				 * @returns {boolean}
				 */
				function ready() {
					return _ready;
				}
				

				function load() {
					var deferred = $q.defer();

					requestService.getSingle('/api/dataStore/epiApp/settings').then(
						function(response) {
							_map = response.data;
							console.log("Loaded map");
							if (_map && _map != '') {
								d2CoreMeta().then(
									function (data) {
										editMap();
										versionUpgrade();
										_ready = true;
										deferred.resolve(true);

									}
								);
							}
						},
						function(response) {
							if (response.status == 404) {

								console.log("No map exists");

								//Try to load template
								template().then(
									function (result) {
										if (result) {
											deferred.resolve(true);
											_ready = true;
										}
										else {
											deferred.resolve(false);
											_ready = false;
										}

									}
								);
							}
							else {
								console.log("Unknown error when getting settings");
								console.log(error);
							}
						}
					);



					return deferred.promise;
				}


				function editMap() {

					_map.currentVersion = 0.1;
					_map.performance[0].name = "DPT 1 coverage vs DPT 1-3 dropout rate";

					return save();


				}


				function save() {

					//Check if we have new DHIS 2 ids to fetch;
					var currentIDs = d2IDs().join('');
					var previousIDs = _dataIDs.join('');
					if (currentIDs != previousIDs) d2CoreMeta();
					//requestService.post('/api/systemSettings', {'dq': angular.toJson(_map)});
					return requestService.put('/api/dataStore/epiApp/settings', angular.toJson(_map));
				}


				function admin() {
					var deferred = $q.defer();
					requestService.getSingle('/api/currentUser.json?fields=userCredentials[userRoles]').then(
						function(response) { //success
							var data = response.data.userCredentials.userRoles;
							var IDs = [];
							for (var i = 0; i < data.length; i++) {
								IDs.push(data[i].id);
							}

							requestService.getSingle('/api/userRoles.json?fields=authorities&filter=id:in:[' + IDs.join(',') + ']')
								.then(function(response) {
									var authorized = false;

									var data = response.data.userRoles;
									for (var i = 0; !authorized && i < data.length; i++) {
										for (var j = 0; !authorized && j < data[i].authorities.length; j++) {
											if (data[i].authorities[j] === 'F_INDICATOR_PUBLIC_ADD') {
												authorized = true;
											}
											if (data[i].authorities[j] === 'ALL') {
												authorized = true;
											}
										}
									}

									deferred.resolve(authorized);
								});
						}
					);

					return deferred.promise;
				}

				/**
				 * Upgrade metadata version
				 */
				function versionUpgrade() {

					var currentVersion = 0.1;
					if (_map.metaDataVersion != currentVersion) {
						console.log("Upgrading");


						_map.metaDataVersion = currentVersion;
						return save();
					}

				}


				/**
				 * DHIS version
				 * TODO: does not belong here?
				 */
				function dhisVersion() {
					return _version;

				}


				function template() {
					var deferred = $q.defer();

					//Check if user is authorized
					admin().then(
						function (authorized) {
							if (authorized) {

								//If authorized, get json template
								requestService.getSingleLocal('data/metaData.json').then(function(response) {

									_map = response.data;

									//Save template to systemSettings
									requestService.post('/api/dataStore/epiApp/settings', angular.toJson(_map)).then(
										function (data) {
											_ready = true;
											deferred.resolve(true);
										},
										function (data) {
											_ready = false;
											deferred.resolve(false);
										}
									);
								});
							}
							else {
								deferred.resolve(false);
							}
						}
					);

					return deferred.promise;
				}



				/** ===== INDICATORS ===== **/

				function indicators(code) {
					if (code) {
						for (var i = 0; i < _map.indicators.length; i++) {
							if (_map.indicators[i].code === code) return _map.indicators[i];
						}
					}
					else {
						return _map.indicators;
					}
				}


				function indicatorAddEdit(name, vaccineAll, vaccineTarget, denominator, code) {
					if (!name || !vaccineAll || !vaccineTarget || !denominator) return false;

					var indicator;
					if (code) {
						indicators = indicators(code);
					}
					else {
						indicator = {
							'code': newIndicatorCode()
						}
					}

					//Add default quality parameters
					indicator.name = name;
					indicator.vaccineAll = vaccineAll;
					indicator.vaccineTarget = vaccineTarget;
					indicator.denominator = denominator;

					//Add to map
					if (code) {
						for (var i = 0; i < _map.indicators.length; i++) {
							if (_map.indicators[i].code === indicator.code) {
								_map.indicators[i] = indicator;
								break;
							}
						}
					}
					else {
						_map.indicators.push(indicator);
					}

					//Save
					save();

					return indicator.code;
				}


				function indicatorDelete(code) {
					for (var i = 0; i < _map.indicators.length; i++) {
						if (_map.indicators[i].code === code) {
							_map.indicators.splice(i, 1);
						}
					}
					
					dropoutCheckIndicators(code);

					save();
				}


				function newIndicatorCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.indicators.length; i++) {

						current = "I" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.indicators.length; j++) {
							if (_map.indicators[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				

				/** ===== RELATIONS ===== **/

				function dropout(code) {
					if (code) {
						var dropouts = [];
						for (var i = 0; i < _map.dropout.length; i++) {
							if (_map.dropout[i].code === code) {
								return _map.dropout[i];
							}
						}
					}
					else {
						return _map.dropout;
					}
				}


				function dropoutAddEdit(name, vaccineFrom, vaccineTo, code) {
					if (!name || !vaccineFrom || !vaccineTo) return false;

					var dropout;
					if (code) {
						dropout = dropout(code);
					}
					else {
						dropout = {
							'code': newDropoutCode()
						}
					}


					dropout.name = name;
					dropout.vaccineFrom = vaccineFrom;
					dropout.vaccineTo = vaccineTo;

					//Add to map
					if (code) {
						for (var i = 0; i < _map.dropout.length; i++) {
							if (_map.dropout[i].code === dropout.code) {
								_map.dropout[i] = dropout;
								break;
							}
						}
					}
					else {
						_map.dropout.push(dropout);
					}

					//Save
					save();

					return dropout.code;
				}


				function dropoutDelete(code) {
					for (var i = 0; i < _map.dropout.length; i++) {
						if (_map.dropout[i].code === code) {
							_map.dropout.splice(i, 1);
						}
					}

					return save();
				}


				function dropoutCheckIndicators(code) {

					for (var i = 0; i < _map.dropout.length; i++) {
						if (_map.dropout[i].vaccineFrom === code || _map.dropout[i].vaccineTo === code) {
							dropoutDelete(_map.dropout[i].code);
							return;
						}
					}
				}

				
				function newDropoutCode() {
					var current, found;
					for (var i = 0; i <= _map.dropout.length; i++) {

						current = "D" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.dropout.length; j++) {
							if (_map.dropout[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				/** PERFORMANCE **/
				function performance(code) {
					if (code) {
						var performance = [];
						for (var i = 0; i < _map.performance.length; i++) {
							if (_map.performance[i].code === code) {
								return _map.performance[i];
							}
						}
					}
					else {
						return _map.performance;
					}
				}


				function performanceAddEdit(indicatorCode, dropoutCode, code) {
					if (!indicatorCode || !dropoutCode) return false;

					var performance;
					if (code) {
						performance = performance(code);
					}
					else {
						performance = {
							'code': newPerformanceCode()
						}
					}

					performance.indicator = indicatorCode;
					performance.dropout = dropoutCode;

					//Add to map
					if (code) {
						for (var i = 0; i < _map.performance.length; i++) {
							if (_map.performance[i].code === performance.code) {
								_map.performance[i] = performance;
								break;
							}
						}
					}
					else {
						_map.performance.push(performance);
					}

					//Save
					save();

					return performance.code;
				}


				function performanceDelete(code) {
					for (var i = 0; i < _map.performance.length; i++) {
						if (_map.performance[i].code === code) {
							_map.performance.splice(i, 1);
						}
					}

					return save();
				}


				function newPerformanceCode() {
					var current, found;
					for (var i = 0; i <= _map.performance.length; i++) {

						current = "P" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.performance.length; j++) {
							if (_map.performance[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				/** UTILITIES **/
				function d2IDs() {
					var dataIDs = [];
					for (var i = 0; i < _map.indicators.length; i++) {
						dataIDs.push(_map.indicators[i].vaccineAll);
						dataIDs.push(_map.indicators[i].vaccineTarget);
						dataIDs.push(_map.indicators[i].denominator);
											}
					for (var i = 0; i < _map.dropout.length; i++) {
						dataIDs.push(_map.dropout[i].vaccineFrom);
						dataIDs.push(_map.dropout[i].vaccineTo);
					}

					return dataIDs.sort();
				}


				function d2CoreMeta() {
					var deferred = $q.defer();

					var dataIDs = d2IDs();
					_dataIDs = dataIDs;

					var promises = [];
					promises.push(d2Meta.objects('dataElements', dataIDs));
					promises.push(d2Meta.objects('indicators', dataIDs));

					//Remove non-operands, to speed things up
					var operands = [];
					for (var i = 0; i < dataIDs.length; i++) {
						if (dataIDs[i].length === 23) { //11 + . + 11
							operands.push(dataIDs[i]);
						}
					}
					if (operands.length > 0) {
						promises.push(d2Meta.objects('dataElementOperands', operands));
					}

					promises.push(d2Meta.version());

					$q.all(promises).then(
						function(datas) {
							_d2Objects = {};
							for (var i = 0; i < datas.length; i++) {
								for (var j = 0; j < datas[i].length; j++) {
									_d2Objects[datas[i][j].id] = datas[i][j];
								}
							}

							_version = datas[datas.length-1];

							deferred.resolve(true);
						}
					);

					return deferred.promise;
				}


				function d2NameFromID(id) {
					if (!_d2Objects.hasOwnProperty(id)) return '';
					return _d2Objects[id].displayName;
				}


				return service;

			}]);

})();
