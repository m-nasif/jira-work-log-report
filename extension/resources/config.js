﻿var Configuration = {
    persistConfig: function (config) {
        var configs = Configuration.getConfigs();
        if (config.id == 0) {
            config.id = (new Date()).getTime();
            configs.push(config);
        } else {
            var index = _.findIndex(configs, function (c) { return c.id == config.id; });
            if (index > -1) {
                configs[index] = config;
            }
        }
        window.localStorage.setItem('host-configs', JSON.stringify(configs));
    },
    deleteConfig: function (id) {
        var configs = Configuration.getConfigs();
        configs = _.reject(configs, function (c) { return c.id == id; });
        window.localStorage.setItem('host-configs', JSON.stringify(configs));
        Configuration.renderContent();
    },
    getConfigs: function () {
        var configs = window.localStorage.getItem('host-configs');
        if (configs) {
            return JSON.parse(configs);
        } else {
            return [];
        }
    },
    saveConfig: function ($container) {
        var config = {
            id: parseInt($container.data('id')),
            name: $.trim($container.find('.config-name').val()).toUpperCase(),
            host: $.trim($container.find('.config-host').val()).toLowerCase(),
            username: $.trim($container.find('.config-username').val()),
            password: $.trim($container.find('.config-password').val())
        };

        var $alertElement = $container.find('.config-save-alert');

        if (!config.name || !config.host || !config.username || !config.password) {
            $alertElement.html("All fields are required.").show();
            return;
        }

        var configs = Configuration.getConfigs();

        if (_.findIndex(configs, function (c) { return c.host == config.host; }) > -1 && config.id == 0) {
            $alertElement.html("There is already a configuration for this host. Please edit that instead of creating a new configuration for the same host.")
                                    .show();
            return;
        }

        if (_.findIndex(configs, function (c) { return c.name == config.name; }) > -1 && config.id == 0) {
            $alertElement.html("There is already a configuration with this name.")
                                    .show();
            return;
        }

        Configuration.persistConfig(config);
        Configuration.renderContent();
    },
    renderContent: function () {
        var newConfig = { id: 0, name: '', host: '', username: '', password: '' };
        var configs = Configuration.getConfigs();
        configs.push(newConfig);

        var template = _.template($("#tmpl-config-section").html());
        $('.config-sections').html(template({ configs: configs }));
    },
    renderDialog: function () {
        Configuration.renderContent();
        $('.settings-dialog')[0].showModal();
    }
};

$(document).ready(function () {
    $('.settings-button').click(function () {
        Configuration.renderDialog();
    });

    $('.settings-dialog').on('click', '.close', function () {
        if (Configuration.getConfigs().length < 1) {
            $('.config-page .list-group-item:last .config-save-alert').html("At least once JIRA connection need to be created to see the reports.").show();
        } else {
            $('.settings-dialog')[0].close();
            Report.renderPage();
        }
    });

    $('.config-page').on('click', '.config-save', function () {
        Configuration.saveConfig($(this).closest('.list-group-item'));
    });

    $('.config-page').on('click', '.config-delete', function () {
        Configuration.deleteConfig($(this).closest('.list-group-item').data('id'));
    });
});