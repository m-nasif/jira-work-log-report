﻿var Report = {
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
        var selectedUsers = Configuration.getUserSelection(window.localStorage.getItem('selected_team_id'));
        return _.filter(Report.data.logs, function (log) {
            return log.date >= startDate && (selectedUsers == null || _.indexOf(selectedUsers, log.username) > -1);
        });
    },
    getLogsGroupedByUser(logs, config) {
        var reportData = [];
        var logsGroupByUser = _.groupBy(logs, function (log) { return log.username; });
        _.each(logsGroupByUser, function (grp, username) {
            var groupedByDays = _.groupBy(grp, function (log) { return log.date; });
            var groupedByDayLogs = _.sortBy(_.map(groupedByDays, function (logArray, date) {
                return {
                    date: new Date(date),
                    logs: logArray,
                    totalTime: Utility.sum(logArray, 'time')
                };
            }), function (log) {
                var time = log.date.getTime();
                return config.dateSort == "DSC" ? -1 * time : time;
            });

            reportData.push({ username: username, logs: groupedByDayLogs, totalTime: Utility.sum(groupedByDayLogs, 'totalTime') });
        });

        return _.sortBy(reportData, function (dt) { return Report.data.usersByName[dt.username].displayName; });
    },
    getLogsGroupedByDate(logs, config) {
        var reportData = [];
        var logsGroupByDate = _.groupBy(logs, function (log) { return log.date; });
        _.each(logsGroupByDate, function (grp, date) {
            var groupedByUser = _.groupBy(grp, function (log) { return log.username; });
            var groupedByUserLogs = _.sortBy(_.map(groupedByUser, function (logArray, username) {
                return {
                    username: username,
                    logs: logArray,
                    totalTime: Utility.sum(logArray, 'time')
                };
            }), function (log) {
                return Report.data.usersByName[log.username].displayName;;
            });

            reportData.push({ date: new Date(date), logs: groupedByUserLogs, totalTime: Utility.sum(groupedByUserLogs, 'totalTime') });
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

        var templateId = renderConfig.groupBy == "DT" ? "#tmpl-logs-by-date" : "#tmpl-logs-by-user";
        var template = _.template($(templateId).html());

        $('.report-content').html(template({ data: reportData, users: Report.data.usersByName }));
        componentHandler.upgradeAllRegistered();
    },
    selectionChanged: function ($item) {
        if ($item.hasClass('option-team')) {
            window.localStorage.setItem('selected_team_id', $item.val());
            Report.renderPage();
        } else if ($item.hasClass('option-users')) {
            var currentSelection = $('.option-users option').map(function (i, elem) { return { name: $(elem).val(), selected: $(elem).prop('selected') }; });
            Configuration.saveUserSelection(window.localStorage.getItem('selected_team_id'), currentSelection);
            Report.renderLogs();
        }
        else {
            Report.renderLogs();
        }
    },
    renderUserSelect: function () {
        $optionUsers = $('.option-users');
        if ($optionUsers[0].sumo) {
            $optionUsers[0].sumo.unload();
            $optionUsers.empty();
        }

        var selectedUsers = Configuration.getUserSelection(window.localStorage.getItem('selected_team_id')) || [];

        _.each(Report.data.users, function (user) {
            var selected = _.indexOf(selectedUsers, user.name) == -1 ? '' : ' selected="selected"';
            $optionUsers.append('<option value="' + user.name + '"' + selected + '>' + user.displayName + '</option>');
        });

        $optionUsers.SumoSelect({ selectAll: true }); // { selectAll: Report.data.users.length > 1 }
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
        JIRA.getWorkLogs(fromDate).done(function (data) {
            $('.jira-api-call-progress').hide();
            $(".report-config-item").show();

            Report.data = {
                logs: data.logs,
                users: data.users,
                usersByName: _.indexBy(data.users, 'name'),
                issues: data.issues
            }
            Report.renderUserSelect();
            Report.renderLogs();
        }).fail(function (errorText) {
            $('.jira-api-call-progress').hide();
            $(".report-config-item:not(:first-child)").hide();
            $('.report-content').html('<p>Failed to retrieve data from JIRA API. Please check JIRA connection configuration and try again.</p>');
            if (errorText) {
                $('.report-content p').append('<br>' + errorText);
            }
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