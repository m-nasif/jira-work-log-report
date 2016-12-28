﻿var JIRA = {
    config: { host: '', username: '', password: '' }
};

JIRA.restCall = function (apiUrl, method, data) {
    var deferred = $.Deferred();

    var request = {
        url: JIRA.config.host + '/rest/api/2/' + apiUrl,
        dataType: "json",
        crossDomain: true,
        contentType: "application/json",
        beforeSend: function (xhr) {
            var base64 = window.btoa(JIRA.config.username + ":" + JIRA.config.password);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Authorization", "Basic " + base64);
            xhr.setRequestHeader("X-Atlassian-Token", "nocheck");
        }
    };

    request.type = method == "POST" ? "POST" : "GET";

    if (data) {
        request.data = JSON.stringify(data);
    }

    $.ajax(request).done(function (data) {
        deferred.resolve(data);
    }).fail(function (error) {
        deferred.reject(error.statusText);
    });

    return deferred.promise();
};

JIRA.getWorkLogs = function (fromDate) {
    var deferred = $.Deferred();

    JIRA.restCall('worklog/updated?since=' + fromDate.getTime()).done(function (logIds) {
        var ids = [];
        for (var i = 0; i < logIds.values.length; i++) {
            ids.push(logIds.values[i].worklogId);
        }

        if (ids.length == 0) {
            deferred.resolve({ users: [], logs: [], issues: null });
        }

        JIRA.restCall('worklog/list', 'POST', { "ids": ids }).done(function (logs) {
            var users = _.map(_.groupBy(logs, function (log) { return log.author.name; }), function (grp) {
                var user = grp[0].author;
                return {
                    name: user.name,
                    displayName: user.displayName,
                    email: user.emailAddress,
                    thumbUrl: (user.avatarUrls && user.avatarUrls["48x48"]) ? user.avatarUrls["48x48"] : ''
                }
            });

            var cleanedLogs = _.each(logs, function (log) { log.date = Utility.getDate(log.started); });

            var cleanedLogs = _.map(logs, function (log) {
                return {
                    date: Utility.getDate(log.started),
                    username: log.author.name,
                    userDisplayName: log.author.displayName,
                    time: log.timeSpentSeconds,
                    comment: log.comment,
                    created: log.created,
                    issueId: log.issueId,
                    id: log.id
                };
            });

            //Get JIRA Issues
            var issueIds = _.uniq(_.pluck(logs, 'issueId'));
            var request = {
                "jql": "id in (" + issueIds.join(',') + ")",
                "startAt": 0,
                "maxResults": 1000,
                "fields": [
                    "summary",
                    "key"
                ],
                "fieldsByKeys": false
            };

            JIRA.restCall('search', 'POST', request).done(function (jiraIssues) {
                var issues = {};

                _.each(jiraIssues.issues, function (issue) {
                    issues[issue.id] = { key: issue.key, summary: issue.fields.summary };
                });

                deferred.resolve({ users: users, logs: cleanedLogs, issues: issues });
            }).fail(function (message) {
                deferred.resolve({ users: users, logs: cleanedLogs, issues: null });
            });
        }).fail(function (message) {
            deferred.reject(message);
        });
    }).fail(function (message) {
        deferred.reject(message);
    });

    return deferred.promise();
};