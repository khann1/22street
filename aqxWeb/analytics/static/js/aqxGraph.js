"use strict";

var aqxgraph;
if (!aqxgraph) {
    aqxgraph = {};
}

(function () {

    function getDataPointsForPlotHC(chart, yTypeList, graphType, numberOfEntries, status) {

        // DataPoints to add to chart
        var dataPointsList = [];

        // The name of a system and the y variable for which it is missing data. used to warn users
        // of which systems are missing requested data, and for which measurement.
        var missingYTypes = "";

        // Track the number of y axes being used.
        var numAxes = 0;

        // Axis dict ensures that each variable is plotted to the same, unique axis for that variable
        // i.e. nitrate values for each system to axis 0, pH values for each system to axis 1, etc.
        // e.g.
        // {
        //   'nitrate' : {isAxis : true, axis : 0},
        //   'pH' : {isAxis : false},
        //   'o2' : {isAxis : true, axis : 1}
        // }
        var axes = {};
        _.each(yTypeList, function(yType){
            axes[yType] = {isAxis:false};
        });

        // Begin iterating through the systems
        _.each(systems_and_measurements, function(system, j) {

            var measurements = system.measurement;
            // Used to group measurement types by system, by linking them to an id. This ensures that the legend only
            // shows "SystemName", instead of "SystemName-nitrate" "SystemName-pH", etc.
            var linkedTo = false;

            // Loop through selected measurement types
            _.each(yTypeList, function(yType) {
                var numValues = 0;
                // Find the measurement data entry that matches the given YType and Status ID
                _.each(measurements, function(measurement) {
                    if (measurement.type.toLowerCase() == yType.toLowerCase() &&
                        (status == '0' || measurement.status == status)) {

                        var systemId = system.system_uid;

                        // Check if there is data for this system and measurement type
                        if (measurement.values.length > 0) {

                            // Has this variable been assigned an axis yet?
                            // If not, create the axis and assign to a variable. This variables isAxis is now true,
                            // an axis is assigned, and the numAxes increments
                            if (!axes[yType].isAxis) {
                                chart.addAxis(aqxgraph.createYAxis(yType, aqxgraph.COLORS[numAxes],
                                                                   numAxes % 2,
                                                                   measurement_types_and_info[yType].unit));
                                axes[yType].isAxis = true;
                                axes[yType].axis = numAxes++;
                            }

                            // Number of the axis this series is plotted against, this determines line color and links
                            // a series to this axis
                            var yAxis = axes[yType].axis;

                            // IMPORTANT: MEASUREMENT VALUES should be sorted by date to display
                            var dataValues = measurement.values;

                            // Collect only the desired number of data points, this can be 30, 60, 90, or all data points.
                            if (!_.isEmpty(numberOfEntries)) {
                                dataValues = _.last(dataValues, numberOfEntries);
                            }

                            // Generate the Object containing data and configurations for this particular series and push to
                            // th list of series to plot
                            dataPointsList.push(aqxgraph.getDataPoints(system.name, dataValues, graphType,
                                                                       systemId, linkedTo,
                                                                       aqxgraph.COLORS[yAxis], yAxis,
                                                                       aqxgraph.DASHSTYLES[j],
                                                                       aqxgraph.MARKERTYPES[j], yType));
                            linkedTo = true;
                            numValues++;
                        }
                    }
                });

                // If there is no data for the given system, measurement type, and status, we will warn the user
                // for this system and measurement type
                if (numValues == 0) {
                    missingYTypes = missingYTypes +  "<li>"+ system.name + " - " + yType + "</li>";
                }
            });
        });

        // Populate the alert message if necessary, and display it
        if (missingYTypes.length > 0){
            $('#alert_placeholder').html(aqxgraph.getAlertHTMLString("These system(s) do not have any data for the selected period: " + missingYTypes,
                                                            aqxgraph.DANGER));
        }
        return dataPointsList;
    }


    function copyYAxes(yAxes){
        var axesToAdd = [];
        _.each(yAxes, function(axis){
            var axisLabel = axis.userOptions.title.text;
            axesToAdd.push(aqxgraph.createYAxis(
                axisLabel,
                axis.userOptions.title.style.color,
                axis.opposite));
        });
        return axesToAdd;
    }

    function copySeries(series, systemID){
        var seriesToAdd = [];
        _.each(series, function (seriesItem) {
            if(_.isEqual(seriesItem.userOptions.id, systemID)){
                var linkedTo = false;
                if (seriesItem.userOptions.linkedTo) linkedTo = true;
                seriesToAdd.push(aqxgraph.getDataPoints(
                    seriesItem.name,
                    seriesItem.userOptions.data,
                    seriesItem.userOptions.type,
                    seriesItem.userOptions.id,
                    linkedTo,
                    seriesItem.color,
                    seriesItem.userOptions.yAxis,
                    seriesItem.userOptions.dashStyle,
                    seriesItem.userOptions.marker.symbol,
                    ""
                ));
            }
        });
        return seriesToAdd;
    }

    function toggleSplitMode(){
        // Can only split with 2+ systems
        if (selectedSystemIDs.length > 1) {

            // List of new charts
            var splitCharts = [];

            // Grab series and yAxes from the overlay chart
            var yAxes = aqxgraph.CHART.yAxis;
            var series = aqxgraph.CHART.series;

            _.each(selectedSystemIDs, function(systemID, k) {
                // Copy over formatting options from overlay chart
                var new_opts = aqxgraph.HC_OPTIONS;

                new_opts.title.text = "NO DATA FOR THIS SYSTEM";
                new_opts.chart.renderTo = "chart-" + k;
                new_opts.yAxis = copyYAxes(yAxes);
                new_opts.series = copySeries(series, systemID);

                // Loop through series to extract system names and assign as titles. If there is no data
                // for a system, then the series will not exist and the name remains "NO DATA FOR THIS SYSTEM"
                for (var i = 0; i < series.length; i++) {
                    if (_.isEqual(systemID, series[i].userOptions.id)) {
                        new_opts.title.text = series[i].name.split(",")[0].trim();
                    }
                }

                // Add new split chart to list of charts
                var chart = new Highcharts.Chart(new_opts);
                splitCharts.push(chart);
            });

            // Draw the split charts
            _.each(splitCharts, function(chart){chart.redraw()});
        }
    }

    aqxgraph.main = function() {

        // Select the default y-axis value
        aqxgraph.setDefaultYAxis();

        // Setup overlay/split toggle
        $('.toggle').toggles({text:{on:'OVERLAY',off:'SPLIT'}, on:true});

        // Disable when graphing only one system
        if(_.isEqual(selectedSystemIDs.length, 1)) {
            $('.toggle').toggleClass('disabled', true);
        }

        // Hide split graphs and show overlay when active
        // When deactivated, create split graphs an hide overlay graph
        $('.toggle').on('toggle', function(e, active) {
            if (active) {
                $('[id^=chart-]').hide();
                $('#analyzeContainer').show();
            } else {
                $('[id^=chart-]').show();
                $('#analyzeContainer').hide();
                toggleSplitMode();
            }
        });

        // When the submit button is clicked, redraw the graph based on user selections
        $('#submitbtn').on('click', function() {
            $('#alert_placeholder').empty();
            aqxgraph.drawChart(getDataPointsForPlotHC);

            // Check if the toggle is active. (i.e, overlay mode enabled)
            // If in split mode, make the split graphs
            if(!$('.toggle').data('toggles').active){
                toggleSplitMode();
            }
        });

        // Reset button, returns dropdowns to default, clears checklist, and displays default nitrate vs time graph
        $('#resetbtn').on('click', function(){

            // Reset X Axis selection to default
            $('#selectXAxis option').prop(aqxgraph.SELECTED, function() {
                return this.defaultSelected;
            });

            // Reset Graph Type selection to default
            $('#selectGraphType option').prop(aqxgraph.SELECTED, function() {
                return this.defaultSelected;
            });

            $('#selectStatus option').prop(aqxgraph.SELECTED, function() {
                return this.defaultSelected;
            });

            $('#' + aqxgraph.NUM_ENTRIES_ELEMENT_ID + ' option').prop(aqxgraph.SELECTED, function() {
                return this.defaultSelected;
            });

            $('#alert_placeholder').empty();

            $('[id^=chart-]').hide();
            $('#analyzeContainer').show();
            $('.toggle').data('toggles').toggle(true, false, true);

            // Select the default y-axis value
            aqxgraph.setDefaultYAxis();
            aqxgraph.drawChart(getDataPointsForPlotHC);
        });

        $('#selectYAxis').bind("chosen:maxselected", function () {
            $('#alert_placeholder').html(aqxgraph.getAlertHTMLString("You can select up to " + aqxgraph.MAXSELECTIONS + " systems", 'danger'));
        });
    };

    // loadChart - On window load, populates the Chart
    window.onload = function() {

        aqxgraph.HC_OPTIONS = {
            chart: {
                renderTo: 'analyzeContainer',
                type: 'line',
                zoomType: 'xy',
                backgroundColor: aqxgraph.BACKGROUND,
                plotBorderColor: '#606063'
            },
            title: {
                text: aqxgraph.CHART_TITLE,
                style: {
                    color: '#E0E0E3'
                }
            },
            credits: {
                style: {
                    color: '#666'
                }
            },
            tooltip: {
                formatter: tooltipFormatter,
                crosshairs: [true,true]
            },
            legend: {
                itemStyle: {
                    color: '#E0E0E3'
                },
                enabled: true,
                labelFormatter: function() {
                    return '<span>'+ this.name.split(",")[0] + '</span>';
                },
                symbolWidth: 60
            },
            xAxis: {
                minPadding: 0.05,
                maxPadding: 0.05,
                title:
                {
                    text: aqxgraph.XAXIS_TITLE,
                    style: {color: 'white   '}
                }
            },
            exporting: {
                csv: {
                    columnHeaderFormatter: function(series) {
                        var name_and_variable = series.name.split(",");
                        return name_and_variable[0] + '-' + name_and_variable[1];
                    }
                }
            },
            showInLegend: true,
            series: []
        };
        try {
            aqxgraph.CHART = new Highcharts.Chart(aqxgraph.HC_OPTIONS);
        } catch(err) {
            console.log("Unable to initialize Highcharts Chart object!");
            console.log(err.stack);
        }
        Highcharts.setOptions(Highcharts.theme);
        // Render chart based on default page setting. i.e. x-axis & graph-type dropdowns, and the y-axis checklist
        aqxgraph.drawChart(getDataPointsForPlotHC);
    };

    function tooltipFormatter() {
        var tooltipInfo = this.series.name.split(",");
        var yVal = tooltipInfo[1];
        var units = measurement_types_and_info[yVal].unit;
        units = (units) ? units : "";
        units = (_.isEqual(units, "celsius")) ? "°C" : units;
        yVal = yVal.charAt(0).toUpperCase() + yVal.slice(1);

        // Get local time and get the day, month, year, and time
        var datestr = this.point.date + ' GMT';
        var datetime = new Date(datestr);
        var time = datetime.toTimeString();
        var day   = datetime.getDate(),
            month = datetime.getMonth()+1,
            year  = datetime.getFullYear();

        // Generate a readable description of any annotations for this datapoint
        var eventString = "";
        if (this.point.annotations) {
            console.log('event found');
            eventString = "<br><p>Most recent event(s): </p>";
            _.each(this.point.annotations, function (event) {
                console.log(event);
                var event_datetime = new Date(event.date + ' GMT');
                eventString = eventString + '<br><p>' + annotationsMap[event.id]+ " at " + event_datetime.toString() + '<p>';
            });
        }

        return '<b>' + tooltipInfo[0] + '</b>' +
            '<br><p>' + yVal + ": " + this.y + ' ' + units + '</p>' +
            '<br><p>Hours in cycle: ' + this.x + '</p>' +
            '<br><p>Measured on: ' + month + '/' + day + '/' + year + '</p>' +
            '<br><p>At time: ' + time +'</p>' +
            eventString;
    }
}());
