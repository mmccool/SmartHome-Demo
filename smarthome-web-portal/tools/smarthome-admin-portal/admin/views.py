# -*- coding: utf-8 -*-
"""
app views
"""
import hashlib
import functools
import json
import os
import time
from datetime import timedelta
from flask import render_template, request, flash, redirect, url_for, make_response, session, abort, jsonify
from admin import db, app
from admin.models import Gateway, _wrapper_dict, User, DataSet, DataModel, GatewayModel
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from admin import weather_api
from admin import weather_api
from admin.machine_learning import train
from admin.machine_learning import predict
from admin.config import ADMIN_PWD, UPLOAD_FOLDER, Model_Seria_FOLDER, Model_Pic_FOLDER


def login_required(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if 'username' in session:
            return func(*args, **kwargs)
        else:
            return redirect(url_for('index'))
    return wrapper


@app.before_request
def make_session_permanent():
    """Set session timeout: 5 mins"""
    session.permanent = True
    app.permanent_session_lifetime = timedelta(minutes=5)


@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html', username=session.get('username'))


@app.route('/authenticate', methods=['POST'])
def authenticate():
    username = request.form['username']
    password = request.form['password']
    password_sha = hashlib.sha256(password).hexdigest()
    if password_sha == ADMIN_PWD:
        session['username'] = username
        resp = make_response(redirect(url_for('index'), code=302))
        resp.set_cookie('JSESSIONID', 'Admin sticky session.')
        return resp
    else:
        info = 'Username or password are incorrect'
        return render_template('index.html', info=info)


@app.route('/logout')
def logout():
    session.pop('username', None)
    resp = make_response(redirect(url_for('index'), code=302))
    resp.set_cookie('__VCAP_ID__', '', expires=0)
    return resp


FORM_DATA = ['name', 'url', 'address', 'latitude', 'longitude']
@app.route('/gateway/update/<int:gw_id>', methods=['PUT', 'POST'])
@login_required
def update_gw(gw_id):
    if request.method == 'POST':
        post = {}
        for key in FORM_DATA:
            post[key] = request.form.get(key, None)
        gw = Gateway.get_or_404(gw_id)
        gw.update(**post)
        db.session.commit()
        flash('The entry was successfully updated.')
    return redirect(url_for('list_all_gws'), 302)


@app.route('/gateway/create', methods=['POST'])
@login_required
def create_gw():
    post = {}
    for key in FORM_DATA:
        post[key] = request.form.get(key, None)
    gw = Gateway.create(**post)
    print gw
    db.session.commit()
    flash('The entry was successfully created.')
    return redirect(url_for('list_all_gws'), 302)


@app.route('/gateways/', methods=['GET'])
@login_required
def list_all_gws():
    obj = Gateway.query.order_by(Gateway.id).all()
    info = _wrapper_dict(obj, ['id', 'name', 'url', 'address', 'latitude', 'longitude', 'created_at'])
    print info
    return render_template('list.html', gateways=info, username=session.get('username'))


@app.route('/gateway')
@app.route('/gateway/<int:gw_id>', methods=['GET'])
@login_required
def show_gw(gw_id=None):
    info = None
    if gw_id:
        gw = Gateway.get_or_404(gw_id)
        info = _wrapper_dict(gw, ['id', 'name', 'url', 'address', 'latitude', 'longitude'])
    return render_template('edit.html', gateway=info, username=session.get('username'))


@app.route('/gateway/delete', methods=['POST', 'DELETE'])
@login_required
def delete_gw():
    if request.method == 'POST':
        gw_str = request.form.get('id', None)
        print gw_str
        if gw_str:
            gw_list = gw_str.split(',')
            for gw_id in gw_list:
                try:
                    gw = Gateway.get_or_404(gw_id)
                    gw.delete()
                    flash('Gateway {} was successfully deleted.'.format(str(gw_str)))
                except IntegrityError:
                    flash('Unable to delete gateway {} because it has remaining user bindings. Plz check.'.format(str(gw_str)))
    return redirect(url_for('list_all_gws'), 302)


@app.route('/gateway/<gateway_name>')
def check_gw_exists(gateway_name=None):
    if gateway_name:
        exists = db.session.query(db.session.query(Gateway).filter_by(name=gateway_name).exists()).scalar()
        if not exists:
            return jsonify(result=True), 200
    return jsonify(result=False), 200


@app.route('/users/', methods=['GET'])
@login_required
def list_all_users():
    obj = User.query.order_by(User.id).all()
    info = _wrapper_dict(obj, ['id', 'username', 'phone', 'gateway', 'created_at'])
    return render_template('list_users.html', users=info, username=session.get('username'))


@app.route('/user/delete', methods=['POST', 'DELETE'])
@login_required
def delete_user():
    if request.method == 'POST':
        user_str = request.form.get('id', None)
        print user_str
        if user_str:
            user_list = user_str.split(',')
            print user_list
            for uid in user_list:
                u = User.get_or_404(int(uid))
                u.delete()
            flash('User {} was successfully deleted.'.format(str(user_str)))
    return redirect(url_for('list_all_users'), 302)


@app.route('/user/<username>')
def check_user_exists(username=None):
    if username:
        exists = db.session.query(db.session.query(User).filter_by(username=username).exists()).scalar()
        if not exists:
            return jsonify(result=True), 200
    return jsonify(result=False), 200


USER_DATA = ['username', 'password', 'phone', 'gateway_id']
@app.route('/user/create', methods=['POST'])
@login_required
def create_user():
    post = {}
    for key in USER_DATA:
        post[key] = request.form.get(key, None)
    user = User.create(**post)
    print user
    db.session.commit()
    flash('The entry was successfully created.')
    return redirect(url_for('list_all_users'), 302)


@app.route('/user')
@app.route('/user/<int:uid>', methods=['GET'])
@login_required
def show_user(uid=None):
    info = None
    if uid:
        user = User.get_or_404(uid)
        info = _wrapper_dict(user, ['id', 'username', 'phone', 'gateway_id', 'gateway'])
    obj = Gateway.query.all()
    gws = _wrapper_dict(obj, ['id', 'name', 'url', 'address', 'latitude', 'longitude', 'created_at'])
    return render_template('edit_user.html', user=info, gateways=gws, username=session.get('username'))


USER_FORM_DATA = ['phone', 'gateway_id', 'username']
@app.route('/user/update/<int:uid>', methods=['PUT', 'POST'])
@login_required
def update_user(uid):
    if request.method == 'POST':
        post = {}
        for key in USER_FORM_DATA:
            post[key] = request.form.get(key, None)
        u = User.get_or_404(uid)
        u.update(**post)
        db.session.commit()
        flash('The entry was successfully updated.')
    return redirect(url_for('list_all_users'), 302)


@app.route('/href_dataset/', methods=['GET'])
@login_required
def href_dataset():
    return render_template('dataset.html', username=session.get('username'))


@app.route('/dataset', methods=['GET'])
@login_required
def list_all_dataset():
    obj = db.session.query(DataSet).filter(DataSet.status == "1").all()
    info = _wrapper_dict(obj, ['id', 'filename', 'dataformat', 'title', 'rows', 'columns', 'rows', 'description',
                               'uploadtime', 'status'])
    json_str = json.dumps(info)
    print json_str
    return json_str, 200


@app.route('/dataset/create', methods=['POST'])
@login_required
def create_dataset():
    # upload the file
    file = request.files['file']

    print file.filename
    filename = secure_filename(file.filename)
    print filename
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    title = request.form['title']
    dataformat = "CSV"
    rows = 356
    columns = 3
    description = "This is dataset for shanghai 2013 year"
    uploadtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))
    status = "1"
    print uploadtime
    ds = DataSet(filename, dataformat, title, rows, columns, description, uploadtime, status)
    db.session.add(ds)
    db.session.commit()
    flash('The Dataset was successfully created.')
    return redirect(url_for('href_dataset'), code=302)


@app.route('/dataset/delete', methods=['POST'])
@login_required
def delete_dataset():
    content = request.get_json(silent=True)
    title = content.get('title')
    obj = db.session.query(DataSet).filter(DataSet.title == title).all()
    print "---delete---"
    print title
    db.session.query(DataSet).filter(DataSet.title == title).delete()
    db.session.commit()

    filename = obj[0].filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    print filepath
    if os.path.exists(filepath):
        os.remove(filepath)
        print "delete successful"
    return redirect(url_for('list_all_dataset'), 302)


@app.route('/href_training/', methods=['GET'])
@login_required
def href_training():
    return render_template('training.html', username=session.get('username'))


@app.route('/training', methods=['GET'])
@login_required
def list_all_models():
    obj = db.session.query(DataModel).filter(DataModel.status == "1").all()
    info = _wrapper_dict(obj, ['id', 'dataset_id', 'name', 'algorithm_type', 'serialization', 'description', 'created_at', 'status', 'dataset'])
    json_str2 = json.dumps(info)
    print json_str2
    return json_str2, 200


@app.route('/training/create', methods=['POST'])
@login_required
def create_model():
    content = request.get_json(silent=True)
    model_name = content.get('model_name')

    dataset_title = content.get('dataset_title')
    obj_dataset = db.session.query(DataSet).filter(DataSet.title == dataset_title).all()
    dataset_id = obj_dataset[0].id
    dataset_filename = obj_dataset[0].filename
    dataset_path = os.path.join(UPLOAD_FOLDER, dataset_filename)
    pic_path = os.path.join(Model_Pic_FOLDER, model_name + ".png")
    train.train(dataset_path, os.path.join(Model_Seria_FOLDER, model_name), model_name, 2, pic_path)

    # write to DB
    algorithm_type = "Linear"
    serialization = 0
    description = "This is a model with Linear model"
    status = "1"

    dm = DataModel(dataset_id, model_name, algorithm_type, serialization, description, status)
    db.session.add(dm)
    db.session.commit()
    flash('The model was successfully created.')
    return redirect(url_for('list_all_models'), code=302)


@app.route('/training/delete', methods=['PUT'])
@login_required
def delete_model():
    content = request.get_json(silent=True)
    model_name = content.get('model_name')
    obj = db.session.query(DataModel).filter(DataModel.name == model_name).all()
    print "---delete---"
    print model_name

    filename = "{}.pkl".format(model_name)
    print filename, Model_Seria_FOLDER
    filepath = os.path.join(Model_Seria_FOLDER, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        print "delete model file successful"
    else:
        print (filepath)

    pic_path = Model_Pic_FOLDER + model_name + ".png"
    if os.path.exists(pic_path):
        os.remove(pic_path)
        print "delete model pic successful"
    else:
        print pic_path

    db.session.query(DataModel).filter(DataModel.name == model_name).delete()
    db.session.commit()

    return redirect(url_for('list_all_models'), 303)


@app.route('/href_predict/', methods=['GET'])
@login_required
def href_predict():
    return render_template('predict.html', username=session.get('username'))


@app.route('/predict', methods=['PUT'])
@login_required
def prediction():
    content = request.get_json(silent=True)
    #print content
    model_name = content.get('model_name')
    input_value = content.get('input_value')
    if not model_name or not isinstance(input_value, (int, long, float)):
        abort(400)
    r_value = predict.predict(model_name, 2, input_value)
    json_str = json.dumps(r_value)
    print json_str
    return json_str, 200


@app.route('/load_weather/', methods=['GET'])
@login_required
def load_weather():
    obj = Gateway.query.all()
    gws = _wrapper_dict(obj, ['id', 'name', 'url', 'address', 'latitude', 'longitude', 'created_at'])
    gw_model = GatewayModel.query.order_by(GatewayModel.id).all()
    ret = _wrapper_dict(gw_model, ['id', 'gateway_id', 'model_id'])
    mapping = {row['gateway_id']: row['model_id'] for row in ret}
    # print mapping
    dm = DataModel.query.all()
    models = _wrapper_dict(dm, ['id', 'name'])
    return render_template('load.html', username=session.get('username'), gateways=gws, mapping=mapping, models=models)


@app.route('/load', methods=['PUT'])
@login_required
def load_data():
    content = request.get_json(silent=True)
    geo = content.get('geo')
    gw_id = content.get('gw_id')
    # model_name = content.get('model_name')
    resp = {}
    ret_code = 200
    if not geo or not gw_id:
        abort(400)
    gm = db.session.query(GatewayModel).filter(GatewayModel.gateway_id == gw_id).all()
    if gm:
        try:
            gm_dict = _wrapper_dict(gm, ["data_model"])
            print gm_dict
            model_name = gm_dict[0]["data_model"]["name"]
            publish_date, list_temp_forecast, today_temp = weather_api.get_temp_forecast(geo, gw_id)
            list_temp_his = weather_api.get_temp_his(geo, publish_date, gw_id, today_temp)
            weather_api.set_temp_his(list_temp_his)
            weather_api.set_temp_forecast(list_temp_forecast)
            list_predict_forecast = weather_api.predict_forecast(model_name, list_temp_forecast, publish_date)
            list_predict_his = weather_api.predict_his(model_name, list_temp_his)
            weather_api.set_actual_his(list_predict_his)
            weather_api.set_predict_his(list_predict_his, publish_date)
            weather_api.set_predict_forecast(list_predict_forecast)
        except Exception as e:
            resp['error'] = e.message
            ret_code = 500
    else:
        resp['error'] = "The gateway is not bound with any models."
        ret_code = 400
    return json.dumps(resp), ret_code


@app.route('/gateway_model', methods=['PUT', 'POST'])
@login_required
def gateway_model():
    content = request.get_json(silent=True)
    gw_id = content.get('gateway_id')
    model_id = content.get('model_id')
    resp ={}
    ret_code = 200
    print content
    if request.method == 'POST':
        # insert new
        if not gw_id or not model_id:
            abort(400)
        data = {"gateway_id": gw_id, "model_id": model_id}
        try:
            GatewayModel.create(**data)
        except Exception as e:
            resp['error'] = e.message
            ret_code = 500
    elif request.method == 'PUT':
        # delete
        try:
            gm = db.session.query(GatewayModel).\
                filter(GatewayModel.model_id == model_id, GatewayModel.gateway_id == gw_id).one()
            if gm:
                gm.delete()
        except Exception as e:
            resp['error'] = e.message
            ret_code = 500
    return json.dumps(resp), ret_code

