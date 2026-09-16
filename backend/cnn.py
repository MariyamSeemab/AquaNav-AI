# Import Tensorflow & Keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense

# Convolutional layers
model = Sequential()

model.add(Conv2D(32, (3, 3), activation='relu',
                 input_shape=(Image_Height, Image_Width, num_channels)))

model.add(MaxPooling2D((2, 2)))

model.add(Conv2D(64, (3, 3), activation='relu'))
model.add(MaxPooling2D((2, 2)))

model.add(Conv2D(64, (3, 3), activation='relu'))

# Dense layers
model.add(Flatten())
model.add(Dense(64, activation='relu'))
model.add(Dense(num_classes, activation='softmax'))

# Compile the model
model.compile(optimizer='adam',
              loss='categorical_crossentropy',
              metrics=['accuracy'])

# Training
history = model.fit(train_images, train_labels,
                    epochs=num_epochs,
                    batch_size=batch_size,
                    validation_data=(test_images, test_labels))
