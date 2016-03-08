/* ##################################################################################################################
   CONSTANTS
   ################################################################################################################## */

var XAXIS = "selectXAxis";
var YAXIS = "selectYAxis";
var XAXISVALUE = "";
var YAXISVALUE = "";
var OPTION = 'option';
var CHART = "";
var SHOW_IN_LEGEND = true;
var GRAPH_TYPE = "selectGraphType";
var CURSOR_TYPE = "pointer";
var ZOOM_ENABLED = true;
var TIME = "Time";
var NITRATE = "Nitrate";
var SELECTED = 'selected';
var LINE = "line";
var SCATTER = "scatter";
var BAR_CHART = "barchart";


/* ##################################################################################################################
   HELPER FUNCTIONS
   ################################################################################################################## */

/**
 *
 * @param graphType - Line or Scatter or Barchart
 * @param showLegend - boolean value (true or false)
 * @param systemName - name of system
 * @param dataPoints - array of values for graph; [{x:"", y: "", data: ""}]
 * @param content - HTML formatted String that populates dataPoint ToolTips
 * @returns {{type: *, showInLegend: *, name: *, dataPoints: *, content: *}}
 */
var getDataPoints = function(graphType, showLegend, systemName, dataPoints, content) {
    return {
        type: graphType,
        showInLegend: showLegend,
        name: systemName,
        dataPoints: dataPoints,
        toolTipContent: content
    };
};


// TODO: This will need to be re-evaluated to incorporate non-time x-axis values. For now, stubbing xType for this.
/**
 *
 * @param xType - X-axis values. Ex: Time, pH, Hardness
 * @param yType - Y-axis values. Ex: pH, Nitrate
 * @param graphType - Type of graph to display. Ex: line, scatter
 * @returns {Array} - An array of CanvasJS dataPoints of yType measurement data for all systems
 */
var getDataPointsForPlot = function(xType, yType, graphType){
    var dataPointsList = [];
    _.each(systems_and_measurements, function(systemMeasurements){
        _.each(systemMeasurements.measurement, function(measurement){
            if (_.isEqual(measurement.type.toLowerCase(), yType.toLowerCase())){
                dataPointsList.push(
                    getDataPoints(
                        graphType,
                        SHOW_IN_LEGEND,
                        systemMeasurements.name,
                        measurement.values,
                        buildTooltipContent(xType, yType)
                    )
                );
            }
        });
    });
    return dataPointsList;
};


/**
 *
 * @param xType - X-axis values. Ex: Time, pH, Hardness
 * @param yType - Y-axis values. Ex: pH, Nitrate
 * @returns HTML that populates dataPoint ToolTips with the specifics of a measurement
 */
var buildTooltipContent = function(xType, yType){
    if (xType === TIME.toLowerCase()){
        xType = "Hours since creation";
    }
    return "<h4>Measured on: {date}</h4> <p>" + xType + ": {x}</p> <p>" + yType + ": {y}</p>"
};


/**
 *
 * @param chart
 * @param xType
 * @param yTypes
 * @param graphType
 */
var updateChartDataPoints = function(chart, xType, yTypes, graphType){
    var newDataSeries = [];
    _.each(yTypes, function(type){
        newDataSeries = newDataSeries.concat(getDataPointsForPlot(xType, type, graphType));
    });
    chart.options.data = newDataSeries;
};


/**
 * Populates dropdown menus for each metadata category
 *
 * @param elementId - Id of the dropdown to populate
 * @param measurement_data_object - Object containing unique measurement types. Ex: pH, nitrate, time
 */
var populateDropdown = function(elementId, measurement_data_object){
    var select = document.getElementById(elementId);
    _.each(measurement_data_object, function(measurement_type){
        var el = document.createElement(OPTION);
        el.textContent = measurement_type;
        el.value = measurement_type.toLowerCase();
        select.appendChild(el);
    });
};


/* ##################################################################################################################
   PAGE-DRIVING FUNCTIONS
   ################################################################################################################## */

/**
 *  main - Sets behaviors for Submit and Reset buttons
 */
var main = function(){

    // When the submit button is clicked, redraw the graph based on user selections
    $('#submitbtn').click(function() {
        var graphType = document.getElementById(GRAPH_TYPE).value;
        var xType = document.getElementById(XAXIS).value;

        // Get measurement types to display on the y-axis
        var yTypes = [];
        _.each($('#listOfYAxisValues input:checked'), function(checkedInput){
            yTypes.push(checkedInput.value.toLowerCase());
        });

        // Generate a data Series for each y-value type, and assign them all to the CHART
        updateChartDataPoints(CHART, xType, yTypes, graphType);

        // TODO: What about the other chart characteristics? Symbols, ranges, different scales, different y-axes?

        // Render the new chart
        CHART.render();
    });

    // Reset button, returns dropdowns to default, clears checklist, and displays defuault nitrate vs time graph
    $('#resetbtn').click(function(){

        // Reset X Axis selection to default
        $('#selectXAxis option').prop(SELECTED, function() {
            return this.defaultSelected;
        });

        // Reset Graph Type selection to default
        $('#selectGraphType option').prop(SELECTED, function() {
            return this.defaultSelected;
        });

        // Uncheck all Y Axis checkboxes
        $('#listOfYAxisValues').find('input[type=checkbox]:checked').removeProp('checked');

        // Reset dataPoints to default nitrate vs. time and redraw chart
        updateChartDataPoints(CHART, TIME, [NITRATE], LINE);
        CHART.render();
    });
};


/**
 *
 * loadChart - On window load, populates the Chart, dropdowns, and checklist
 */
var loadChart = function() {
    //Grabs the default XAxis type, time, and the default YAxis type, pH
    //var selected_yvalue_type = document.getElementById("selectYAxis").value;
    //var selected_xvalue_type = document.getElementById("selectXAxis").value;

    var selectedYType = NITRATE.toLowerCase();
    var selectedXType = TIME.toLowerCase();

    //Grabs the default graph type from the Graph Style selection dropdown
    var graphType = document.getElementById(GRAPH_TYPE).value;

    // Get the default nitrate vs. time dataPoints
    var content = buildTooltipContent(selectedXType, selectedYType);
    var dataPoints = getDataPointsForPlot(selectedXType, selectedYType, graphType, content);

    // Create our default chart which plots nitrate vs. time
    CHART = new CanvasJS.Chart("analyzeContainer", {
        title :{
            text : "My CanvasJS"
        },
        // TODO: This will change, we need a procedure for setting min/max ranges based on XType
        // TODO: Also need to take into consideration ranges for YType
        axisX : {
            minimum : 0
        },
        legend : {
            cursor : CURSOR_TYPE,
            itemclick : function (e)
            {
                if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                    e.dataSeries.visible = false;
                } else {
                    e.dataSeries.visible = true;
                }
                e.chart.render();
            }
        },
        zoomEnabled : ZOOM_ENABLED,
        data : dataPoints
    });

    // Render the default chart
    CHART.render();

    // Fill x-value dropdown with all measurement types, plus time
    populateDropdown(XAXIS, [TIME].concat(dropdown_values));
};