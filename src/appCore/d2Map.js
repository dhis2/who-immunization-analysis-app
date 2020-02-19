/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (requestService, d2Meta, d2Utils, $q) {

    //Define factory API
    var service = {
        ready: ready,
        load: load,
        save: save,
        admin: admin,
        versionUpgrade: versionUpgrade,
        dhisVersion: dhisVersion,
        rimMeta: rimMeta,
        rimUpdateConfig: rimUpdateConfig,
        rimIndicatorTemplate: rimIndicatorTemplate,
        rimVaccineCodes: rimVaccineCodes,
        rimIndicatorType: rimIndicatorType,
        rimIndicatorGroup: rimIndicatorGroup,
        rimUserGroup: rimUserGroup,
        rimImported: rimImported,
        rimAccess: rimAccess,
        rimCodes: rimCodes,
        indicators: indicators,
        indicatorsConfigured: indicatorsConfigured,
        indicatorAddEdit: indicatorAddEdit,
        indicatorDelete: indicatorDelete,
        dropouts: dropouts,
        dropoutsConfigured: dropoutsConfigured,
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

        requestService.getSingle("/dataStore/epiApp/settings").then(
            function(response) {
                _map = response.data;
                console.log("Loaded map");
                if (_map && _map != "") {
                    d2CoreMeta().then(
                        function () {
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
                }
            }
        );



        return deferred.promise;
    }


    function editMap() {

        _map.currentVersion = 0.1;



        return save();
    }


    function save() {

        //Check if we have new DHIS 2 ids to fetch;
        var currentIDs = d2IDs().join("");
        var previousIDs = _dataIDs ? _dataIDs.join("") : "";
        if (currentIDs != previousIDs) d2CoreMeta();
        return requestService.put("/dataStore/epiApp/settings", angular.toJson(_map));
    }


    function admin() {
        var deferred = $q.defer();
        d2Meta.authorizations().then(
            function(auths) {
                var authorized = false;
                for (let j = 0; !authorized && j < auths.length; j++) {
                    if (auths[j] === "F_INDICATOR_PUBLIC_ADD") {
                        authorized = true;
                    }
                    if (auths[j] === "ALL") {
                        authorized = true;
                    }
                }
									

                deferred.resolve(authorized);
            }
        );

        return deferred.promise;
    }



    /**
     * Upgrade metadata version
     */
    function versionUpgrade() {

        var currentVersion = 0.1;
        if (_map.metaDataVersion != currentVersion) {
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
                    requestService.getSingleLocal("data/metaData.json").then(function(response) {

                        _map = response.data;

                        //Save template to systemSettings
                        requestService.post("/dataStore/epiApp/settings", angular.toJson(_map)).then(
                            function success() {
                                _ready = true;
                                deferred.resolve(true);
                            },
                            function fail() {
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


    /** ===== RIM ===== **/

    function rimAccess() {
        var deferred = $q.defer();

        if (!_map.rim || !_map.rim.imported) deferred.resolve(false);
        else {
            d2Meta.currentUser().then(function(response) {
                var groups = response.userGroups;
                for (let i = 0; i < groups.length; i++) {
                    if (groups[i].id === _map.rim.userGroup) {
                        deferred.resolve(true);
                        return;
                    }
                }
                deferred.resolve(false);
            });
        }

        return deferred.promise;
    }

    function rimMeta() {
        return _map.rim;
    }


    function rimUpdateConfig(dataSetId, districtLevel, provinceLevel, countryCode) {
        _map.rim.dataSetId = dataSetId;
        _map.rim.districtLevel = districtLevel;
        _map.rim.provinceLevel = provinceLevel;
        _map.rim.countryCode = countryCode;

        return save();
    }


    function rimImported(userGroupId, dataSetId, districtLevel, provinceLevel, countryCode) {
        _map.rim = {
            "imported": true,
            "userGroup": userGroupId,
            "dataSetId": dataSetId,
            "districtLevel": districtLevel,
            "provinceLevel": provinceLevel,
            "countryCode": countryCode
        };
        return save();
    }


    function rimVaccineCodes() {
        var deferred = $q.defer();
        requestService.getSingleLocal("data/RimVaccineCodes.json").then(function(response) {

            deferred.resolve(response.data.vaccines);

        });

        return deferred.promise;
    }

    function rimIndicatorTemplate() {
        var deferred = $q.defer();
        requestService.getSingleLocal("data/RimIndicators.json").then(function(response) {

            deferred.resolve(response.data.indicators);

        });

        return deferred.promise;
    }

    function rimCodes() {
        var deferred = $q.defer();

        //First get the relevant indicators (by codes)
        rimIndicatorTemplate().then(function(indicators) {
            var codes = [];
            for (let i = 0; i < indicators.length; i++) {
                codes.push(indicators[i].code);
            }

            deferred.resolve(codes);

        });

        return deferred.promise;
    }

    function rimIndicatorType() {
        var deferred = $q.defer();
        requestService.getSingleLocal("data/defaultIndicatorType.json").then(function(response) {

            deferred.resolve(response.data.indicatorTypes[0]);

        });

        return deferred.promise;
    }

    function rimIndicatorGroup() {
        var deferred = $q.defer();
        requestService.getSingleLocal("data/defaultIndicatorGroup.json").then(function(response) {

            deferred.resolve(response.data.indicatorGroups[0]);

        });

        return deferred.promise;
    }

    function rimUserGroup() {
        var deferred = $q.defer();
        requestService.getSingleLocal("data/defaultUserGroup.json").then(function(response) {

            deferred.resolve(response.data.userGroups[0]);

        });

        return deferred.promise;
    }


    /** ===== INDICATORS ===== **/
    function indicators(code) {
        if (code) {
            for (let i = 0; i < _map.indicators.length; i++) {
                if (_map.indicators[i].code === code) return _map.indicators[i];
            }
        }
        else {
            return _map.indicators;
        }
    }


    function indicatorsConfigured(code) {
        if (code) {
            for (let i = 0; i < _map.indicators.length; i++) {
                if (_map.indicators[i].code === code) {
                    if (_map.indicators[i].vaccineAll && _map.indicators[i].vaccineAll != "") {
                        return _map.indicators[i];
                    }
                    else {
                        return false;
                    }

                }
            }
        }
        else {
            var indicators = [];
            for (let i = 0; i < _map.indicators.length; i++) {
                if (_map.indicators[i].vaccineAll && _map.indicators[i].vaccineAll != "") {
                    indicators.push(_map.indicators[i]);
                }
            }
        }
        return indicators;
    }


    function indicatorAddEdit(name, vaccineAll, vaccineTarget, denominator, code) {
        if (!name || !vaccineAll || !vaccineTarget || !denominator) return false;

        var indicator;
        if (code) {
            console.log("Editing indicator");
            indicator = indicators(code);
        }
        else {
            console.log("Adding indicator");
            indicator = {
                "code": newIndicatorCode()
            };
        }

        //Add default quality parameters
        indicator.displayName = name;
        indicator.vaccineAll = vaccineAll;
        indicator.vaccineTarget = vaccineTarget;
        indicator.denominator = denominator;

        //Add to map
        if (code) {
            for (let i = 0; i < _map.indicators.length; i++) {
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
        for (let i = 0; i < _map.indicators.length; i++) {
            if (_map.indicators[i].code === code) {
                _map.indicators.splice(i, 1);
            }
        }
					
        dropoutCheckIndicators(code);

        save();
    }


    function newIndicatorCode() {

        //Get and return next possible code
        var current;
        for (let i = 0; i <= _map.indicators.length; i++) {

            current = "I" + parseInt(i+1);
            var existing = false;

            for (let j = 0; j < _map.indicators.length; j++) {
                if (_map.indicators[j].code === current) existing = true;
            }

            if (!existing) return current;
        }
    }



    /** ===== RELATIONS ===== **/

    function dropouts(code) {
        if (code) {
            for (let i = 0; i < _map.dropout.length; i++) {
                if (_map.dropout[i].code === code) {
                    return _map.dropout[i];
                }
            }
        }
        else {
            return _map.dropout;
        }
    }

    function dropoutsConfigured(code) {
        if (code) {
            for (let i = 0; i < _map.dropout.length; i++) {
                if (_map.dropout[i].code === code) {
                    if (indicatorsConfigured(_map.dropout[i].vaccineFrom) && indicatorsConfigured(_map.dropout[i].vaccineTo)) {
                        return _map.dropout[i];
                    }
                    else {
                        return false;
                    }

                }
            }
        }
        else {
            var dropout = [];
            for (let i = 0; i < _map.dropout.length; i++) {
                if (indicatorsConfigured(_map.dropout[i].vaccineFrom) && indicatorsConfigured(_map.dropout[i].vaccineTo)) {
                    dropout.push(_map.dropout[i]);
                }
            }
        }
        return dropout;
    }


    function dropoutAddEdit(name, vaccineFrom, vaccineTo, code) {
        if (!name || !vaccineFrom || !vaccineTo) return false;

        var dropout;
        if (code) {
            dropout = dropouts(code);
        }
        else {
            dropout = {
                "code": newDropoutCode()
            };
        }


        dropout.displayName = name;
        dropout.vaccineFrom = vaccineFrom;
        dropout.vaccineTo = vaccineTo;

        //Add to map
        if (code) {
            for (let i = 0; i < _map.dropout.length; i++) {
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
        for (let i = 0; i < _map.dropout.length; i++) {
            if (_map.dropout[i].code === code) {
                _map.dropout.splice(i, 1);
            }
        }

        return save();
    }


    function dropoutCheckIndicators(code) {

        for (let i = 0; i < _map.dropout.length; i++) {
            if (_map.dropout[i].vaccineFrom === code || _map.dropout[i].vaccineTo === code) {
                dropoutDelete(_map.dropout[i].code);
                return;
            }
        }
    }


    function newDropoutCode() {
        var current;
        for (let i = 0; i <= _map.dropout.length; i++) {

            current = "D" + parseInt(i+1);
            let existing = false;

            for (let j = 0; j < _map.dropout.length; j++) {
                if (_map.dropout[j].code === current) existing = true;
            }

            if (!existing) return current;
        }
    }


    /** PERFORMANCE **/
    function performance(code) {
        if (code) {
            for (let i = 0; i < _map.performance.length; i++) {
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

        var perf;
        if (code) {
            perf = performance(code);
        }
        else {
            perf = {
                "code": newPerformanceCode()
            };
        }

        perf.indicator = indicatorCode;
        perf.dropout = dropoutCode;

        //Add to map
        if (code) {
            for (let i = 0; i < _map.performance.length; i++) {
                if (_map.performance[i].code === perf.code) {
                    _map.performance[i] = perf;
                    break;
                }
            }
        }
        else {
            _map.performance.push(perf);
        }

        //Save
        save();

        return perf.code;
    }


    function performanceDelete(code) {
        for (let i = 0; i < _map.performance.length; i++) {
            if (_map.performance[i].code === code) {
                _map.performance.splice(i, 1);
            }
        }

        return save();
    }


    function newPerformanceCode() {
        var current;
        for (let i = 0; i <= _map.performance.length; i++) {

            current = "P" + parseInt(i+1);
            let existing = false;

            for (let j = 0; j < _map.performance.length; j++) {
                if (_map.performance[j].code === current) existing = true;
            }

            if (!existing) return current;
        }
    }


    /** UTILITIES **/
    function d2IDs() {
        var dataIDs = [];
        for (let i = 0; i < _map.indicators.length; i++) {
            dataIDs.push(_map.indicators[i].vaccineAll);
            dataIDs.push(_map.indicators[i].vaccineTarget);
            dataIDs.push(_map.indicators[i].denominator);
        }
        for (let i = 0; i < _map.dropout.length; i++) {
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
        promises.push(d2Meta.objects("dataElements", dataIDs));
        promises.push(d2Meta.objects("indicators", dataIDs));

        //Remove non-operands, to speed things up
        var operands = [];
        for (let i = 0; i < dataIDs.length; i++) {
            if (dataIDs[i].length === 23) { //11 + . + 11
                operands.push(dataIDs[i]);
            }
        }
        if (operands.length > 0) {
            promises.push(d2Meta.objects("dataElementOperands", operands));
        }

        promises.push(d2Meta.version());

        $q.all(promises).then(
            function(datas) {
                _d2Objects = {};
                for (let i = 0; i < datas.length; i++) {
                    for (let j = 0; j < datas[i].length; j++) {
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
        if (!_d2Objects.hasOwnProperty(id)) return "";
        return _d2Objects[id].displayName;
    }


    return service;

}

