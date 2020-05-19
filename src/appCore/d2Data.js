/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

import d2DataHelper from "./d2DataHelper";

export default function (requestService, d2Utils, $q) {

    //Define factory API
    var service = {
        addRequest: addRequest,
        createRequest: createRequest,
        fetch: fetch,
        value: dataValue,
        valueFromSource: dataValueFromSource,
        values: dataValues,
        name: name,
    };

    //Private variables
    var _newRequests = [];		//Store new requests
    var _requestBatches = [];	//Batches of requests are queued here
    var _currentBatch;			//Batch currently being fetched
    var _currentBatchMeta;

    var _aggregationType = false;

    var receivedData = [];
    var mergedData;


    /**
	 * === === === === === ===
	 * PUBLIC FUNCTIONS
	 * === === === === === ===
	 */

    /**
	 * Add request for data to be fetched
	 *
	 * @param dx			(Array of) data IDs - data element, indicator, data element operand, dataset
	 * @param pe			(Array of) periods in ISO format
	 * @param ouBoundary	(Array of) boundary orgunit IDs
	 * @param ouLevel		Optional - level (int) for orgunit disaggregation.
	 * @param ouGroup		Optional - group (id) for orgunit disaggregation
	 */
    function addRequest(dx, pe, ouBoundary, ouLevel, ouGroup, aggregationType) {

        _newRequests = d2Utils.arrayMerge(_newRequests,
            makeRequestURLs(
                d2Utils.toArray(dx),
                d2Utils.toArray(pe),
                d2Utils.toArray(ouBoundary),
                ouLevel,
                ouGroup,
                aggregationType
            ));

    }

    /**
	 * Creates a request for data to be fetched. Same functionality as addRequest except it returns the request separately instead
	 *
	 * @param dx			(Array of) data IDs - data element, indicator, data element operand, dataset
	 * @param pe			(Array of) periods in ISO format
	 * @param ouBoundary	(Array of) boundary orgunit IDs
	 * @param ouLevel		Optional - level (int) for orgunit disaggregation.
	 * @param ouGroup		Optional - group (id) for orgunit disaggregation
	 */
    function createRequest(dx, pe, ouBoundary, ouLevel, ouGroup, aggregationType) {
        return makeRequestURLs(
            d2Utils.toArray(dx),
            d2Utils.toArray(pe),
            d2Utils.toArray(ouBoundary),
            ouLevel,
            ouGroup,
            aggregationType
        );
    }


    /**
	 * Fetch data, based on requests that have already been added
	 *
	 * @returns {* promise}
	 */
    function fetch() {

        var newBatch = new Batch(_newRequests);
        _requestBatches.push(newBatch);
        _newRequests = [];

        if (!_currentBatch) fetchNextRequest();

        return newBatch.promise();
    }


    /**
	 * Look up individual data values from the current result.
	 *
	 * @param de, pe, ou, co	IDs
	 * @param aggregationType
	 * @returns float of datavalue, or null if not found
	 */
    function dataValueFromSource(de, pe, ou, co, at, dataSource) {
        if (co === undefined) co = null;
        if (at === undefined) at = null;

        //Make it possible to work with both de and co separately, and in . format
        if (de.length === 23) {
            co = de.substr(12,11);
            de = de.substr(0,11);
        }

        var header = dataSource.headers;
        var dataValues = dataSource.rows;

        var dxi, pei, oui, coi, vali, ati;
        for (let i = 0; i < header.length; i++) {
            if (header[i].name === "dx" && !header[i].hidden) dxi = i;
            if (header[i].name === "ou" && !header[i].hidden) oui = i;
            if (header[i].name === "pe" && !header[i].hidden) pei = i;
            if (header[i].name === "co" && !header[i].hidden) coi = i;
            if (header[i].name === "value" && !header[i].hidden) vali = i;
            if (header[i].name === "at") ati = i;
        }

        var data;
        for (let i = 0; i < dataValues.length; i++) {
            data = dataValues[i];
            if (
                (dxi === undefined || data[dxi] === de) &&
							(pei === undefined || data[pei] === pe.toString()) &&
							(oui === undefined || data[oui] === ou) &&
							(co === undefined || coi === undefined || data[coi] === co) &&
							(at === undefined || ati === undefined || data[ati] === at)
            )
                return parseFloat(data[vali]);
        }

        return null;
    }

    function dataValue(de, pe, ou, co, at) {
        return dataValueFromSource(de, pe, ou, co, at, mergedData);
    }


    /**
	 * Look up data values from the current result.
	 *
	 * @param de, pe, ou, co	IDs
	 * @returns float of datavalue, or null if not found
	 */
    function dataValues(de, pe, ou, co) {
        var value, values = [];

        de = d2Utils.toArray(de);
        pe = d2Utils.toArray(pe);
        ou = d2Utils.toArray(ou);
        co = co === undefined ? null : d2Utils.toArray(co);

        for (let i = 0; i < de.length; i++) {

            for (let j = 0; j < pe.length; j++) {

                for (let k = 0; k < ou.length; k++) {

                    if (co && co.length > 0) {
                        for (let l = 0; l < co.length; l++) {

                            value = dataValue(de[i], pe[j], ou[k], co[l]);
                        }
                    }
                    else {
                        value = dataValue(de[i], pe[j], ou[k]);
                    }

                    if (value) values.push(value);
                }

            }

        }


        return values;
    }


    /**
	 * Look up names based on ID.
	 */
    function name(id) {
        var items = mergedData.metaData.items;
        var name;

        //data element operand
        if (id.length === 23) {
            name = items[id.substr(0,11)].name + " " + items[id.substr(12,11)].name;
        }
        else {
            name = items[id].name;
        }

        return name;
    }



    /**
	 * === === === === === ===
	 * PRIVATE FUNCTIONS
	 * === === === === === ===
	 */

    /**
	 * Makes DHIS 2 analytics request based on the given parameters.
	 *
	 * @param dxAll			Array of data IDs
	 * @param pe			Array of ISO periods
	 * @param ouBoundary	Array of boundary orgunit IDs
	 * @param ouLevel		Orgunit level for disaggregation
	 * @param ouGroup		Orgunit group for disaggregation
	 * @param aggregationType Aggregation type for the request. Null = default
	 * @returns {Array}		Array of requests
	 */
    function makeRequestURLs(dxAll, pe, ouBoundary, ouLevel, ouGroup, aggregationType) {

        const dx = [];
        const dxCo = [];
        for (let i = 0; i < dxAll.length; i++) {

            const dataID = dxAll[i];
            if (!dataID) {
                continue;
            }
            else if (dataID.length === 23) {
                dxCo.push(dataID.substr(0, 11));
            }
            else {
                dx.push(dataID);
            }
        }

        let ouDisaggregation = "";
        if (ouLevel) {
            ouDisaggregation += ";LEVEL-" + ouLevel;
        }
        else if (ouGroup) {
            ouDisaggregation += ";OU_GROUP-" + ouGroup;
        }

        let requestURL;
        let requestURLs = [];
        if (dx.length > 0) {

            requestURL = "/analytics.json";
            requestURL += "?dimension=dx:" + dx.join(";");
            requestURL += "&dimension=ou:" + ouBoundary.join(";");
            requestURL += ouDisaggregation;
            requestURL += "&dimension=pe:" + pe.join(";");
            requestURL += "&hierarchyMeta=true"; //TODO - should be option
            requestURL + "&displayProperty=NAME";
            if (aggregationType) {
                requestURL += "&aggregationType=" + aggregationType;
            }


            requestURLs.push(requestURL);
        }

        if (dxCo.length > 0) {
            requestURL = "/analytics.json";
            requestURL += "?dimension=dx:" + dxCo.join(";");
            requestURL += "&dimension=co";
            requestURL += "&dimension=ou:" + ouBoundary.join(";");
            requestURL += ouDisaggregation;
            requestURL += "&dimension=pe:" + pe.join(";");
            requestURL + "&displayProperty=NAME";
            if (aggregationType) requestURL += "&aggregationType=" + aggregationType;

            requestURLs.push(requestURL);
        }

        return requestURLs;
    }


    /**
	 * Fetch next request from the queue of requests.
	 */
    function fetchNextRequest() {


        //Need to get new batch
        if (!_currentBatch) {
            _currentBatch = _requestBatches.pop();
            if (!_currentBatch) return;
        }

        //Get next request in batch
        var request = _currentBatch.request();
        if (!request) return;

        fixAggregationType(request);

        requestService.getSingleData(request).then( function(data) {
            if (data) {
                if (_aggregationType) {
                    data = addAggregationInfo(data, _aggregationType);
                }
                receivedData.push(data);
            }

            //Current batch is done - merge the data we have so far, and fulfill the promise
            if (_currentBatch.done()) {
                _currentBatchMeta = d2DataHelper.mergeMetaData(receivedData);
                mergedData = d2DataHelper.mergeAnalyticsResults(mergedData, receivedData);
                resolveCurrentBatch();
            }
            //We are not done, so fetch the next
            else {
                fetchNextRequest();
            }

        });
    }

    function fixAggregationType(request) {
        //TODO: temporary fix
        if (request.match("aggregationType=COUNT")) {
            _aggregationType = "COUNT";
        }
        else {
            _aggregationType = false;
        }
    }


    /**
	 * Add info about aggregationtype to result
	 */
    function addAggregationInfo(data, aggregationType) {
        data.headers.push({"name": "at"});
        for (let i = 0; i < data.rows.length; i++) {
            data.rows[i].push(aggregationType);
        }

        return data;
    }


    /**
	 * Call when data for the current batch has been fetched and merged.
	 * Resolves the data promise, clears the current batch, and calls for more data
	 */
    function resolveCurrentBatch() {
        _currentBatch.resolve(_currentBatchMeta);
        _currentBatch = null;
        fetchNextRequest();
    }


    /** === BATCH CLASS ===
	 * Class used to store "batches" of requests. Has an array of requests and a promise, with methods
	 * to query and access these.
	 */

    function Batch(requests) {
        this._requests = requests;
        this._deferred = $q.defer();

        this._receivedData = [];
        this._started = false;
        this._batchMeta = null;
    }

    Batch.prototype.promise = function() {
        return this._deferred.promise;
    };

    Batch.prototype.resolve = function(data) {
        this._deferred.resolve(data);
    };

    Batch.prototype.request = function() {
        return this._requests.pop();
    };

    Batch.prototype.done = function() {
        return this._requests.length === 0 ? true : false;
    };

    Batch.prototype.id = function() {
        return this._id;
    };


    return service;

}