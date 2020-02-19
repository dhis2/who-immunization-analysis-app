/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (requestService, periodService, d2Utils, $q) {

    //Define factory API
    var service = {
        object: object,
        objects: objects,
        orgunitIDs: orgunitIDs,
        orgunitCountEstimate: orgunitCountEstimate,
        currentUser: currentUser,
        userOrgunit: userOrgunit,
        userOrgunits: userOrgunits,
        userOrgunitsHierarchy: userOrgunitsHierarchy,
        userAnalysisOrgunits: userAnalysisOrgunits,
        indicatorDataElements: indicatorDataElements,
        indicatorDataElementOperands: indicatorDataElementOperands,
        indicatorDataElementIDsNumerator: indicatorDataElementIDsNumerator,
        indicatorDataSets: indicatorDataSets,
        indicatorPeriodType: indicatorPeriodType,
        indicatorFormulaText: indicatorFormulaText,
        dataElementOperands: dataElementOperandsFromIDs,
        dataElementOrIndicator: dataElementOrIndicator,
        authorizations: authorizations,
        postMetadata: postMetadata,
        setSharing: setSharing,	
        version: version
    };


    /** ===== GENERAL - ANY OBJECT ===== */
    function object(object, id, fieldString) {
        var deferred = $q.defer();

        var requestURL = "/" + object + "/" + id + ".json?";
        if (fieldString) requestURL += "fields=" + fieldString;

        if (fieldString && fieldString.indexOf("name") > -1) {
            console.log("Used name");
        }

        requestService.getSingleData(requestURL).then(
            function(data) {
                deferred.resolve(data);
            },
            function(error){
                console.log("d2meta error: object(), type:" + object);
                console.log(error);
                deferred.resolve(null);

            }
        );

        return deferred.promise;
    }


    function objects(object, ids, fieldString, filterString, paging) {
        paging = paging === null || paging === undefined ? paging = false : paging;

        var deferred = $q.defer();

        if (fieldString && fieldString.indexOf("name") > -1) {
            console.log("Warning: Used name property");
            fieldString += ",displayName";
        }
					

        var requestURL;
        if (ids) {
            requestURL = "/" + object + ".json?";
            requestURL += "filter=id:in:[" + ids.join(",") + "]&";
        }
        else {
            requestURL = "/" + object + ".json?";
        }

        if (fieldString) requestURL += "fields=" + fieldString;
        if (filterString) requestURL += "&filter=" + filterString;
        requestURL += "&paging=" + paging;

        requestService.getSingleData(requestURL).then(
            function(data) {
                if (paging) deferred.resolve(data);
                else deferred.resolve(data[object]);

            },
            function(error){
                console.log("d2meta error: objects(), type:" + object);
                console.log(error);
            }
        );

        return deferred.promise;
    }



    /** ===== ORGUNITS ===== */

    /**
				 * Returns and array of orgunit IDs based on orgunit boundary and level and/or group. If both level
				 * and group is specified, level will be used.
				 *
				 * @param ouBoundary
				 * @param ouLevel
				 * @param ouGroup
				 */
    function orgunitIDs(ouBoundary, ouLevel, ouGroup) {
        var deferred = $q.defer();

        ouBoundary = d2Utils.toArray(ouBoundary);

        //TODO: split if estimate is > ???

        //Find orgunit disaggregation
        var ouDisaggregation = "";
        if (ouLevel) ouDisaggregation += ";LEVEL-" + ouLevel;
        else if (ouGroup) ouDisaggregation += ";OU_GROUP-" + ouGroup;

        var requestURL = "/analytics.json?dimension=pe:2000W01"; //Period is not important
        requestURL += "&filter=ou:" + d2Utils.toArray(ouBoundary).join(";");
        requestURL += ouDisaggregation;
        requestURL += "&displayProperty=NAME&skipData=true";

        requestService.getSingleData(requestURL).then(function(data) {

            var orgunits = data.metaData.dimensions.ou;
            var boundary = [];
            var subunits = [];

            var ou;
            for (let i = 0; i < orgunits.length; i++) {
                ou = orgunits[i];
                var isBoundary = false;
                for (let j = 0; !isBoundary && j < ouBoundary.length; j++) {

                    if (ou == ouBoundary[j]) isBoundary = true;

                }

                isBoundary ? boundary.push(ou) : subunits.push(ou);
            }

            deferred.resolve({
                "orgunits": orgunits,
                "boundary": boundary,
                "subunits": subunits
            });
        });

        return deferred.promise;
    }



    function orgunitCountEstimate(ouBoundary, ouLevel, ouGroup) {
        var deferred = $q.defer();
        ouBoundary = d2Utils.toArray(ouBoundary);

        if (!ouLevel && !ouGroup) deferred.resolve(ouBoundary.length);
        else {

            //TODO: multiple boundary orgunits = check all? Although this is perhaps enough for an estimate
            var filterString = "filter=path:like:" + ouBoundary[0];
            if (ouLevel) filterString += "&filter=level:eq:" + ouLevel;
            if (ouGroup) filterString += "&filter=organisationUnitGroups.id:eq:" + ouGroup;

            var requestURL = "/organisationUnits.json?";
            requestURL += filterString;

            requestService.getSingleData(requestURL).then(
                function(data) { //success
                    var orgunitCount = data.pager.total;
                    deferred.resolve(orgunitCount*ouBoundary.length);
                },
                function(response) { //error
                    deferred.reject("Error in userOrgunit()");
                    console.log(response);
                }
            );
        }

        return deferred.promise;
    }


    /**
	 * Returns user orgunit. If user has multiple orgunits, the one at the lowest level is
	 * returned. If there are multiple orgunits at the same level, the first returned from the
	 * server is return.
	 *
	 * @returns {*}		User orgunit object
	 */
    function userOrgunit() {
        var deferred = $q.defer();

        var requestURL = "/organisationUnits.json?";
        requestURL += "userOnly=true&fields=id,displayName,level&paging=false";

        requestService.getSingleData(requestURL).then(
            function(data) { //success
                data = data.organisationUnits;

                var minLevel = 100;
                var lowestOrgunit = null;
                for (let i = (data.length - 1); i >= 0; i--) {
                    if (data[i].level < minLevel) {
                        minLevel = data[i].level;
                        lowestOrgunit = data[i];
                    }
                }
                deferred.resolve(lowestOrgunit);
            },
            function(response) { //error
                deferred.reject("Error in userOrgunit()");
                console.log(response);
            }
        );

        return deferred.promise;
    }


    /**
	 * Returns user orgunits, i.e. an array of all user orgunits.
	 *
	 * @returns {*}		Array of user orgunit objects
	 */
    function userOrgunits() {
        var deferred = $q.defer();

        var requestURL = "/organisationUnits.json?";
        requestURL += "userOnly=true&fields=id,displayName,level&paging=false";

        requestService.getSingleData(requestURL).then(
            function(data) { //success
                deferred.resolve(data.organisationUnits);
            },
            function(error) { //error
                deferred.reject("Error in userOrgunits()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /**
	 * Returns user orgunits, i.e. an array of all user orgunits, including their childrena and
	 * grandchildren. TODO: merge with userOrgunits, and have children as parameter
	 *
	 * @returns {*}
	 */
    function userOrgunitsHierarchy() {
        var deferred = $q.defer();

        var requestURL = "/organisationUnits.json?";
        requestURL += "userOnly=true&fields=id,displayName,level,children[displayName,level,id,children[displayName,level,id]]&paging=false";

        requestService.getSingleData(requestURL).then(
            function(data) { //success

                deferred.resolve(data.organisationUnits);

            },
            function(error) { //error
                deferred.reject("Error in userOrgunitsHierarchy()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /**
	 * Returns user view orgunits. Includes children, and a bool to indicate whether grandchildren
	 * exists for each child.
	 *
	 * @returns {*}
	 */
    function userAnalysisOrgunits() {
        var deferred = $q.defer();

        var requestURL = "/organisationUnits.json?";
        requestURL += "userDataViewFallback=true&fields=id,displayName,level,children[displayName,level,id,children::isNotEmpty]&paging=false";

        requestService.getSingleData(requestURL).then(
            function(data) { //success
                deferred.resolve(data.organisationUnits);
            },
            function(error) { //error
                deferred.reject("Error in userAnalysisOrgunits()");
                console.log(error);
            }
        );

        return deferred.promise;
    }



    /** ===== DATA ELEMENT OPERANDS ===== */
    function dataElementOperandsFromIDs(ids) {
        var deferred = $q.defer();

        console.log("Use d2Meta.objects instead for 2.22 and newer");

        var operandDictionary = {};
        var categoryOptionCombos = [];
        var dataElements = [];
        for (let i = 0; i < ids.length; i++) {
            operandDictionary[ids[i]] = true;
            var parts = ids[i].split(".");
            dataElements.push(parts[0]);
            if (parts.length > 1) categoryOptionCombos.push(parts[1]);
        }

        var requestURL = "/dataElementOperands.json?";
        requestURL += "filter=dataElement.id:in:[" + dataElements.join(",") + "]";
        if (categoryOptionCombos.length > 0) requestURL += "&filter=categoryOptionCombo.id:in:[" + categoryOptionCombos.join(",") + "]";
        requestURL += "&paging=false";
        requestService.getSingleData(requestURL).then(
            function(data) {
                var allOperands = data.dataElementOperands;
                var operands = [];
                for (let i = 0; i < allOperands.length; i++) {
                    if (operandDictionary[allOperands[i].id]) operands.push(allOperands[i]);
                }
                deferred.resolve(operands);
            },
            function(error){
                console.log("d2meta error: dataElementOperandsFromIDs()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    function dataElementDataSets(ids) {
        var deferred = $q.defer();

        var requestURL = "/dataElements.json?";
        requestURL += "fields=displayName,id,dataSets[displayName,id,periodType,organisationUnits::size]";
        requestURL += ",dataSetElements[dataSet[displayName,id,periodType,organisationUnits::size]";
        requestURL += "&filter=id:in:[" + ids.join(",") + "]";
        requestURL += "&paging=false";

        requestService.getSingleData(requestURL).then(
            function(data) {

                var datasets = [];
                var dataElements = data.dataElements;
                for (let i = 0; i < dataElements.length; i++) {
                    var de = dataElements[i];

                    for (let j = 0; j < de.dataSetElements.length; j++) {
                        datasets.push(de.dataSetElements[j].dataSet);
                    }

                }
                d2Utils.arraySortByProperty(datasets, "name", false);
                datasets = d2Utils.arrayRemoveDuplicates(datasets, "id");
                deferred.resolve(datasets);
            },
            function(error){
                console.log("d2meta error: dataElementDataSets(ids)");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    function dataElementOrIndicator(id) {
        var deferred = $q.defer();

        requestService.getSingleData("/dataElements.json?fields=displayName,id&filter=id:eq:" + id).then(
            function(data) { //success
                data = data.dataElements;
                if (data && data.length === 1) {
                    deferred.resolve(data[0]);
                }
                else {

                    requestService.getSingleData("/indicators.json?fields=displayName,id&filter=id:eq:" + id)
                        .then(function(data) {
                            data = data.indicators;
                            if (data && data.length === 1) {
                                deferred.resolve(data[0]);
                            }
                            else {
                                return null;
                            }
                        });

                }
            }
        );

        return deferred.promise;
    }



    /** ===== INDICATORS ===== */
    function indicatorDataElements(id) {
        var deferred = $q.defer();

        var requestURL = "/indicators/" + id + ".json?";
        requestURL += "fields=displayName,id,numerator,denominator";

        requestService.getSingleData(requestURL).then(
            function(data) {
                var indicator = data;
                var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, indicator.denominator, true);

                objects("dataElements", dataElementIDs).then(function (data) {

                    deferred.resolve(data);

                });

            },
            function(error){
                console.log("d2meta error: indicatorDataElements(id)");
                console.log(error);
                deferred.resolve([]);
            }
        );

        return deferred.promise;
    }


    function indicatorDataElementOperands(id) {
        var deferred = $q.defer();

        var requestURL = "/indicators/" + id + ".json?";
        requestURL += "fields=displayName,id,numerator,denominator";

        requestService.getSingleData(requestURL).then(
            function(data) {
                var indicator = data;
                var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, indicator.denominator, true);
                var dataElementAndOperandIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, indicator.denominator, false);

                objects("dataElements", dataElementIDs).then(function (data) {

                    var ids = [];
                    for (let i = 0; i < data.length; i++) {
                        ids.push(data[i].id);
                    }

                    objects("dataElementOperands", null, "displayName,id,dimensionItem", "dataElement.id:in:[" + ids.join(",") + "]", false).then(
                        function (data) {

                            var included = [];
                            for (let i = 0; i < data.length; i++) {
                                for (let j = 0; j < dataElementAndOperandIDs.length; j++) {
                                    var op = dataElementAndOperandIDs[j];
                                    if (op.indexOf(".") > 0) {
                                        if (data[i].dimensionItem === op) {
                                            included.push(data[i]);
                                        }
                                    }
                                    else {
                                        if (data[i].id.startsWith(op)) {
                                            included.push(data[i]);
                                        }
                                    }
                                }

                            }

                            deferred.resolve(included);
                        }
                    );

                });

            },
            function(error){
                console.log("d2meta error: indicatorDataElements(id)");
                console.log(error);
                deferred.resolve([]);
            }
        );

        return deferred.promise;
    }

    function indicatorDataElementIDsNumerator(id) {
        var deferred = $q.defer();

        var requestURL = "/indicators/" + id + ".json?";
        requestURL += "fields=displayName,id,numerator,denominator";

        requestService.getSingleData(requestURL).then(
            function(data) {
                var indicator = data;
                var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, "", true);

                deferred.resolve(dataElementIDs);

            },
            function(error){
                console.log("d2meta error: indicatorDataElements(id)");
                console.log(error);
                deferred.resolve([]);
            }
        );

        return deferred.promise;
    }


    function indicatorDataSets(id) {
        var deferred = $q.defer();

        indicatorDataElements(id).then(
            function (data) {

                var ids = [];
                for (let i = 0; i < data.length; i++) {
                    ids.push(data[i].id);
                }


                dataElementDataSets(ids).then(
                    function(data) {
                        deferred.resolve(data);
                    },
                    function(error) {
                        console.log("d2meta error: indicatorDataSets(id)");
                        console.log(error);
                    }
                );

            },
            function (error) {
                console.log("d2meta error: indicatorDataSets(id)");
                console.log(error);
            }

        );

        return deferred.promise;
    }


    function indicatorFormulaText(formula) {
        var deferred = $q.defer();

        //GET DEFAULT
        defaultCategoryOptionCombo().then(
            function(data) {
                var df = data.id;

                var components = {};
                var dataElements = [];
                var dataElementOperands = [];
                var constants = [];

                //Data
                let matches = formula.match(/#{(.*?)}/g);
                for (let i = 0; matches && i < matches.length; i++) {
                    let match = matches[i];
                    let id = match.slice(2,-1);

                    let type;
                    if (id.length === 11) {
                        type = "total";
                        dataElements.push(id.slice(0,11));
                    }
                    else if (id.indexOf(df) > 0) {
                        type = "default";
                        dataElements.push(id.slice(0,11));
                    }
                    else {
                        type = "operand";
                        dataElementOperands.push(id);
                    }
                    components[id] = type;
                }

                //Constants
                matches = formula.match(/C{(.*?)}/g);
                for (let i = 0; matches && i < matches.length; i++) {
                    let match = matches[i];
                    let id = match.slice(2,-1);

                    components[id] = "constant";
                    constants.push(id);
                }


                //GET DATA
                let promises = [];
                promises.push(objects("dataElements", dataElements));
                promises.push(objects("dataElementOperands", dataElementOperands));
                promises.push(objects("constants", constants, "displayName,id,value"));

                $q.all(promises).then(
                    function(datas) {

                        var displayDictionary = {};
                        for (let i = 0; i < datas[0].length; i++) {
                            displayDictionary[datas[0][i].id] = datas[0][i].displayName;
                        }
                        for (let i = 0; i < datas[1].length; i++) {
                            displayDictionary[datas[1][i].id] = datas[1][i].displayName;
                        }
                        for (let i = 0; i < datas[2].length; i++) {
                            displayDictionary[datas[2][i].id] = datas[2][i].value;
                        }

                        for (let id in components) {
                            switch (components[id]) {
                            case "total":
                                formula = formula.replace("#{" + id + "}", displayDictionary[id] + " (total)");
                                break;
                            case "default":
                                formula = formula.replace("#{" + id + "}", displayDictionary[id.slice(0,11)] + " (default)");
                                break;
                            case "operand":
                                formula = formula.replace("#{" + id + "}", displayDictionary[id]);
                                break;
                            case "constant":
                                formula = formula.replace("C{" + id + "}", displayDictionary[id]);
                                break;
                            }
                        }

                        console.log(formula);
                        deferred.resolve(formula);
                    }
                );

            }

        );

        return deferred.promise;
    }


    function indicatorPeriodType(id) {
        var deferred = $q.defer();

        indicatorDataSets(id).then(
            function(dataSets) {
                var periodTypes = {};
                for (let i = 0; i < dataSets.length; i++) {
                    periodTypes[dataSets[i].periodType] = true;
                }
                periodTypes = d2Utils.arrayFromKeys(periodTypes);

                deferred.resolve(periodService.shortestPeriod(periodTypes));
            }
        );


        return deferred.promise;
    }


    /** ===== CATEGORIES ===== */

    function defaultCategoryOptionCombo() {
        var deferred = $q.defer();

        var requestURL = "/categoryOptionCombos.json?";
        requestURL += "filter=name:in:[default,(default)]";
        requestURL  += "&fields=displayName,id";
        requestURL  += "&paging=false";
        requestService.getSingleData(requestURL).then(
            function(data) {
                deferred.resolve(data.categoryOptionCombos[0]);
            },
            function(error){
                console.log("d2meta error: defaultCategoryOptionCombo()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /** ===== USER ===== */
    function currentUser() {
        var deferred = $q.defer();

        var requestURL = "/me.json";
        requestService.getSingleData(requestURL).then(
            function(data) {
                deferred.resolve(data);
            },
            function(error){
                console.log("d2meta error: currentUser()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    function authorizations() {
        var deferred = $q.defer();

        var requestURL = "/me/authorization.json";
        requestService.getSingleData(requestURL).then(
            function(data) {
                deferred.resolve(data);
            },
            function(error){
                console.log("d2meta error: authorizations()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /** ===== SYSTEM ===== */
    function version() {
        var deferred = $q.defer();

        var requestURL = "/system/info.json";
        requestService.getSingleData(requestURL).then(
            function(data) {
                deferred.resolve(parseInt(data.version.split(".")[1]));
            },
            function(error){
                console.log("d2meta error: version()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /** ===== IMPORT METADATA ===== */
    function postMetadata(payload, strategy) {
        var deferred = $q.defer();

        var requestURL = "/metadata";
        if (strategy) requestURL += "?strategy=" + strategy;

        //console.log(JSON.stringify(payload));
		
        requestService.post(requestURL, payload).then(
            function(data) {
                deferred.resolve(data);
            },
            function(error){
                console.log("d2meta error: postMetadata()");
                console.log(error);
            }
        );

        return deferred.promise;
    }


    /** ===== SET SHARING===== */
    function setSharing(id, type, sharing) {
        var deferred = $q.defer();

        var requestURL = "/sharing?type=" + type + "&id=" + id;
        requestService.post(requestURL, sharing).then(
            function(data) {
                deferred.resolve(data);
            },
            function(error){
                console.log("d2meta error: postMetadata()");
                console.log(error);
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }





    return service;

}
