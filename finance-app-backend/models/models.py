import pandas as pd 
from sklearn.model_selection import train_test_split 
from sklearn.linear_model import LinearRegression 
import pickle

# Sample data (You would replace this with your actual data)
data = {
    'income': [4000, 5000, 6000, 7000, 8000],
    'expense': [2000, 2500, 3000, 3500, 4000],
    'savings': [2000, 2500, 3000, 3500, 4000]
}

df = pd.DataFrame(data)

# Features and target
X = df[['income', 'expense']]
y = df['savings']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Save the model
with open('model.pkl', 'wb') as file:
    pickle.dump(model, file)