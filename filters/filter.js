"use strict";
exports.__esModule = true;
exports.filterVISTAARData = void 0;
var date_fns_1 = require("date-fns");
function filterVISTAARData(vistaarData, filters) {
    var filteredWeather = vistaarData.weather.filter(function (item) {
        // Filter by station codes and names
        var stationCodeMatch = !filters.station_codes.length || filters.station_codes.includes(item.location.code) || !item.location.code;
        var stationNameMatch = !filters.station_names.length || filters.station_names.includes(item.location.name) || !item.location.name;
        // Filter by latitude and longitude
        var latMatch = !filters.lat || item.location.lat === filters.lat || !item.location.lat;
        var longMatch = !filters.long || item.location.lon === filters.long || !item.location.lon;
        // Filter by date range
        var dateMatch = !filters.start_date || !filters.end_date || (0, date_fns_1.isWithinInterval)((0, date_fns_1.parseISO)(item.date), { start: (0, date_fns_1.parseISO)(filters.start_date), end: (0, date_fns_1.parseISO)(filters.end_date) });
        return stationCodeMatch && stationNameMatch && latMatch && longMatch && dateMatch;
    });
    var filteredAdvisory = vistaarData.advisory.filter(function (item) {
        return !filters.crops.length || filters.crops.includes(item.crop_name);
    });
    return { weather: filteredWeather, advisory: filteredAdvisory };
}
exports.filterVISTAARData = filterVISTAARData;
