"use strict";
exports.__esModule = true;
exports.transformOUATDataToBeckn = void 0;
function transformOUATDataToBeckn(ouatData) {
    // NOT SURE HOW TO IMPLEMENT CONTEXT
    var context = {
        domain: 'string',
        country: 'string',
        city: 'string',
        action: 'search',
        core_version: 'string',
        bap_id: 'string',
        bap_uri: 'string',
        bpp_id: 'string',
        bpp_uri: 'string',
        transaction_id: 'string',
        message_id: 'string',
        timestamp: new Date().toISOString(),
        key: 'string',
        ttl: 'string'
    };
    var items = Object.entries(ouatData.weather_details).map(function (_a) {
        var date = _a[0], details = _a[1];
        return ({
            time: { label: date },
            location_id: '',
            tags: {
                rainfall: details.rainfall,
                t_max: details.t_max,
                t_min: details.t_min,
                rh_max: details.rh_max,
                rh_min: details.rh_min,
                wind_speed: details.wind_speed,
                wind_direction: details.wind_direction,
                cloud_cover: details.cloud_cover,
                Sunset_time: '',
                Sunrise_time: '',
                Moonset_time: '',
                Moonrise_time: '',
                forecast: ''
            }
        });
    });
    var categories = Object.entries(ouatData.crops_data).map(function (_a) {
        var name = _a[0], data = _a[1];
        return ({
            descriptor: {
                name: name,
                long_desc: data.advisory.join(' ')
            }
        });
    });
    var catalog = {
        providers: [
            {
                items: items
            }
        ],
        categories: categories,
        tags: {
            general_advisory: ouatData.general_advisory,
            date: ouatData.date
        }
    };
    var message = {
        catalog: catalog
    };
    return { context: context, message: message };
}
exports.transformOUATDataToBeckn = transformOUATDataToBeckn;
