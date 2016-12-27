var JIRA = {
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
        alert(error.statusText);
        deferred.reject();
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
            deferred.resolve([]);
        }

        JIRA.restCall('worklog/list', 'POST', { "ids": ids }).done(function (logs) {
            deferred.resolve(logs);
        }).fail(function (message) {
            deferred.reject(message);
        });
    }).fail(function (message) {
        deferred.reject(message);
    });

    return deferred.promise();
};