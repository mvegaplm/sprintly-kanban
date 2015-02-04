var config = require('config');

var oauthConfig ={
  protocol: 'oauth2',
  auth: config.sprintly_api_root + '/oauth2/authorize',
  token: config.sprintly_api_root + '/oauth2/access_token',
  scope: ['read','write'],
  scopeSeparator: '+',
  profile: function (credentials, params, get, callback) {
    var profileUrl = config.sprintly_api_root + '/api/user/whoami.json';
    get(profileUrl, null, function (profile) {
      credentials.profile = {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        raw: profile
      };
      return callback();
    });
  }
};

exports.register = function(server, options, next) {

  server.register([
    require('hapi-auth-cookie'),
    require('bell')
  ], function(err) {
    if (err) {
      throw err;
    }

    server.auth.strategy('session', 'cookie', {
      password: config.cookie_password,
      redirectTo: '/login',
      isSecure: process.env.NODE_ENV === 'production'
    });

    server.auth.strategy('sprintly', 'bell', {
      provider: oauthConfig,
      password: config.cookie_password,
      isSecure: process.env.NODE_ENV === 'production',
      forceHttps: process.env.NODE_ENV === 'production',
      clientId: config.client_id,
      clientSecret: config.client_secret,
    });

    server.route([
      {
        method: ['GET', 'POST'],
        path: '/login',
        config: {
          auth: 'sprintly',
          handler: function(request, reply) {
            if (!request.auth.isAuthenticated) {
              return reply('Authentication failed due to: ' + request.auth.error.message);
            }

            request.auth.session.set(request.auth.credentials);
            reply.redirect('/');
          }
        }
      },
      {
        method: 'GET',
        path: '/logout',
        config: {
          auth: 'session'
        },
        handler: function(request, reply) {
          request.auth.session.clear();
          reply.redirect('/');
        }
      }
    ]);

    next();
  });

};

exports.register.attributes = {
  name: 'sprintly oauth'
};