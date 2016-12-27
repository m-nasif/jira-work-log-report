var Report = {
    data: {},
    getRenderConfig: function () {
        return {
            timeFrame: $('.option-time-frame').val(),
            groupBy: $('.option-group-by').val(),
            dateSort: $('.option-date-sort').val()
        };
    },
    getfilteredLogs: function (config) {
        var startDate = config.timeFrame == '1WK' ? Utility.getWeekStartDate() : Utility.getMonthStartDate();
        return _.filter(Report.data.logs, function (log) { return log.date >= startDate; });
    },
    getLogsGroupedByUser(logs, config) {
        var reportData = [];
        var logsGroupByUser = _.groupBy(logs, function (log) { return log.author.name; });
        _.each(logsGroupByUser, function (grp, key) {
            var groupedByDays = _.groupBy(grp, function (log) { return log.date; });
            var groupedByDayLogs = _.sortBy(_.map(groupedByDays, function (logArray, key) {
                return {
                    date: new Date(key),
                    logs: logArray,
                    totalTime: _.reduce(logArray, function (sum, log) {
                        return sum + log.timeSpentSeconds;
                    }, 0)
                };
            }), function (log) {
                var time = log.date.getTime();
                return config.dateSort == "DSC" ? -1 * time : time;
            });

            reportData.push({ user: grp[0].author, logs: groupedByDayLogs });
        });

        return _.sortBy(reportData, function (dt) { return dt.user.displayName });
    },
    getLogsGroupedByDate(logs, config) {
        var reportData = [];
        var logsGroupByDate = _.groupBy(logs, function (log) { return log.date; });
        _.each(logsGroupByDate, function (grp, key) {
            var groupedByUser = _.groupBy(grp, function (log) { return log.author.name; });
            var groupedByUserLogs = _.sortBy(_.map(groupedByUser, function (logArray, username) {
                return {
                    logs: logArray,
                    totalTime: _.reduce(logArray, function (sum, log) {
                        return sum + log.timeSpentSeconds;
                    }, 0)
                };
            }), function (log) {
                return log.logs[0].author.displayName;
            });

            reportData.push({ date: new Date(key), logs: groupedByUserLogs });
        });

        return _.sortBy(reportData, function (dt) {
            var time = dt.date.getTime();
            return config.dateSort == "DSC" ? -1 * time : time;
        });
    },
    renderLogs: function () {
        var renderConfig = Report.getRenderConfig();
        var logs = Report.getfilteredLogs(renderConfig);
        var reportData = renderConfig.groupBy == 'USR' ?
            Report.getLogsGroupedByUser(logs, renderConfig) :
            Report.getLogsGroupedByDate(logs, renderConfig);

        console.log(reportData);

        var templateId = renderConfig.groupBy == "DT" ? "#tmpl-logs-by-date" : "#tmpl-logs-by-user";
        var template = _.template($(templateId).html());

        $('.report-content').html(template({ reportData: reportData }));
    },
    selectionChanged: function ($item) {
        if ($item.hasClass('option-team')) {
            window.localStorage.setItem('selected_team_id', $item.val());
            Report.renderPage();
        } else {
            Report.renderLogs();
        }
    },
    renderPage: function () {
        var jiraConfigs = Configuration.getConfigs();
        if (jiraConfigs.length < 1) {
            return;
        }

        var selectedTeamId = window.localStorage.getItem('selected_team_id');
        if (!selectedTeamId || _.findIndex(jiraConfigs, function (c) { return c.id == selectedTeamId; }) < 0) {
            selectedTeamId = jiraConfigs[0].id;
            window.localStorage.setItem('selected_team_id', selectedTeamId);
        }

        var selectedTeam = null;

        var $teamDD = $('.option-team').empty();
        for (var i = 0; i < jiraConfigs.length; i++) {
            var selected = '';
            if (jiraConfigs[i].id == selectedTeamId) {
                selectedTeam = jiraConfigs[i];
                selected = ' selected="selected"';
            }

            $teamDD.append('<option value="' + jiraConfigs[i].id + '"' + selected + '>' + jiraConfigs[i].name + '</option>');
        }

        $('.report-content').html('');
        $('.jira-api-call-progress').show();

        var fromDate = Utility.getMonthStartDate();
        JIRA.config = selectedTeam;
        JIRA.getWorkLogs(fromDate).done(function (logs) {
            $('.jira-api-call-progress').hide();
            _.each(logs, function (log) { log.date = Utility.getDate(log.started); });
            Report.data.logs = logs;
            Report.data.users = _.map(_.groupBy(logs, function (log) { return log.author.name; }), function (grp) { return grp[0].author });
            Report.renderLogs();
        });
    }
};

$(document).ready(function () {
    if (Configuration.getConfigs().length < 1) {
        Configuration.renderDialog();
    } else {
        Report.renderPage();
    }

    $('.report-config-panel select').change(function () {
        Report.selectionChanged($(this));
    });
});