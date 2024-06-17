from flask import Flask, request, jsonify 
import pickle
import pandas as pd     

app = Flask(__name__)

# Load the trained model
with open('model.pkl', 'rb') as file:
    model = pickle.load(file)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    df = pd.DataFrame(data, index=[0])
    prediction = model.predict(df)
    return jsonify({'prediction': prediction[0]})

if __name__ == '__main__':
    app.run(port=5000)
