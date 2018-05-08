# -*- coding: utf-8 -*-
"""
Data analytics: predict trend by model
"""
from numpy import *
import pickle
import os
from admin.config import Model_Seria_FOLDER

 
def predict(model_name, iteration, predict_value):
    file_name = os.path.join(Model_Seria_FOLDER, model_name+'.pkl')
    pkl_file = open(file_name, 'rb')
    model = pickle.load(pkl_file)
    pkl_file.close()
    #value = (((model[0][0]* float(Predict_value))**Iteration) + (model[0][1]*float(Predict_value)) + (model[0][2]))
    value = model[0][0]*predict_value**iteration + model[0][1]*predict_value + model[0][2]
    r_value = str(round(float(str(value)), 2))
    # print r_value
    return r_value


#print Predict('ShangHai_Linear',2,80)
#print Predict('test',2,55)
