import os
from mysql.connector.pooling import MySQLConnectionPool
from flask import url_for
from flask import Flask, render_template,redirect
from flask import session
from dav.analytics_views import dav
from dav.analytics_views import init_dav
from sc.models import init_sc_app
from sc.views import social

# UI imports
from flask_bootstrap import Bootstrap
import frontend as ui
from frontend import frontend

from nav import nav

from flask_oauth import OAuth

os.environ['AQUAPONICS_SETTINGS'] = "system_db.cfg"
# To hold db connection pool
app = Flask(__name__)
# Secret key for the Session
app.secret_key = os.urandom(24)
app.register_blueprint(dav, url_prefix='/dav')
app.register_blueprint(social, url_prefix='/social')
app.register_blueprint(frontend, url_prefix='')
pool = None
# Social Component DB Configuration Settings
app.config.from_pyfile("sc/settings.cfg")
app.config['BOOTSTRAP_SERVE_LOCAL'] = True

Bootstrap(app)


######################################################################
# method to create connection pool to mySQL DB when application starts
######################################################################


def create_conn(app):
    global pool
    print("PID %d: initializing pool..." % os.getpid())
    dbconfig = {
        "host": app.config['HOST'],
        "user": app.config['USER'],
        "passwd": app.config['PASS'],
        "db": app.config['DB']
    }
    pool = MySQLConnectionPool(pool_name="mypool", pool_size=app.config['POOLSIZE'], **dbconfig)


@app.route('/')
def index():
    return render_template('index.html')


######################################################################
# render error page
######################################################################
@app.errorhandler(500)
def page_not_found(e):
    return render_template('error.html'), 500



oauth = OAuth()

google = oauth.remote_app('google',
                          base_url='https://www.google.com/accounts/',
                          authorize_url='https://accounts.google.com/o/oauth2/auth',
                          request_token_url=None,
                          request_token_params={
                              'scope': 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/plus.login',
                              'response_type': 'code'},
                          access_token_url='https://accounts.google.com/o/oauth2/token',
                          access_token_method='POST',
                          access_token_params={'grant_type': 'authorization_code'},
                          consumer_key='942461862574-ghm0gs1j16m730tgd1pct5pd5kfv7akk.apps.googleusercontent.com',
                          consumer_secret='pb7FUHfE7Dmrh8XMAjt6Gz1j')



@app.route('/getToken')
def getToken():
    callback = url_for('authorized', _external=True)
    return google.authorize(callback=callback)


@app.route('/oauth2callback')
@google.authorized_handler
def authorized(resp):
    access_token = resp['access_token']
    # print(access_token)
    session['access_token'] = access_token, ''
    session['token'] = access_token
    return redirect(url_for('Home'))


@app.route('/dav/social/Home')
@app.route('/social/Home')
@app.route('/Home')
#######################################################################################
# function : home
# purpose : renders userData.html
# parameters : None
# returns: userData.html page
#######################################################################################
def Home():
    access_token = session.get('access_token')
    if access_token is None:
        return redirect(url_for('getToken'))

    access_token = access_token[0]
    from urllib2 import Request, urlopen, URLError

    headers = {'Authorization': 'OAuth ' + access_token}
    req = Request('https://www.googleapis.com/oauth2/v1/userinfo',
                  None, headers)
    try:
        res = urlopen(req)
    except URLError, e:
        if e.code == 401:
            # Unauthorized - bad token
            session.pop('access_token', None)
            return redirect(url_for('getToken'))
    return redirect(url_for('social.signin'))


# Common init method for application
if __name__ == "__main__":
    # Initialize the aquaponics db connection
    app.debug = True
    app.config.from_envvar('AQUAPONICS_SETTINGS')
    create_conn(app)
    init_dav(pool)
    ui.init_app(pool)
    # Intialize the social component global app instance
    init_sc_app(app)
    # Initialise UI's nav routing
    nav.init_app(app)
    app.run(debug=True)
