import json
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model


# ============================================================
# ECO SORT AI — MODEL TRAINING CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_DIR = BASE_DIR / "dataset"
MODEL_PATH = BASE_DIR / "waste_model.keras"
METADATA_PATH = BASE_DIR / "model_metadata.json"

IMG_SIZE = (224, 224)
BATCH_SIZE = 16

VALIDATION_SPLIT = 0.20
SEED = 123

INITIAL_EPOCHS = 15
FINE_TUNE_EPOCHS = 10

INITIAL_LR = 1e-4
FINE_TUNE_LR = 1e-5

FINE_TUNE_LAST_LAYERS = 40


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)


# ============================================================
# STARTUP
# ============================================================

print("\n" + "=" * 60)
print("EcoSort AI — Smart Waste Classifier")
print("Model Training Pipeline")
print("=" * 60)

print("TensorFlow:", tf.__version__)
print("Dataset:", DATASET_DIR)
print("Model:", MODEL_PATH)


# ============================================================
# DATASET VALIDATION
# ============================================================

if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset directory not found: {DATASET_DIR}"
    )

if not DATASET_DIR.is_dir():
    raise NotADirectoryError(
        f"Dataset path is not a directory: {DATASET_DIR}"
    )


class_directories = sorted(
    [
        directory
        for directory in DATASET_DIR.iterdir()
        if directory.is_dir()
        and not directory.name.startswith(".")
    ]
)

if len(class_directories) < 2:
    raise ValueError(
        "Dataset must contain at least two class folders."
    )


print("\nDataset classes:")

for index, directory in enumerate(class_directories):
    print(
        f"  {index}: {directory.name}"
    )


# ============================================================
# LOAD DATASET
# ============================================================

print("\nLoading training dataset...")

train_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=VALIDATION_SPLIT,
    subset="training",
    seed=SEED,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
)


print("\nLoading validation dataset...")

val_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=VALIDATION_SPLIT,
    subset="validation",
    seed=SEED,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)


# ============================================================
# CLASS ORDER
# ============================================================

class_names = train_ds.class_names

if class_names != val_ds.class_names:
    raise RuntimeError(
        "Training and validation class ordering mismatch."
    )

if len(class_names) != len(class_directories):
    raise RuntimeError(
        "Dataset class discovery mismatch."
    )


print("\nFinal class mapping:")

for index, class_name in enumerate(class_names):
    print(
        f"  {index} -> {class_name}"
    )


# ============================================================
# DATASET PERFORMANCE
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)


# ============================================================
# DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential(
    [
        layers.RandomFlip(
            "horizontal"
        ),

        layers.RandomRotation(
            0.08
        ),

        layers.RandomZoom(
            0.10
        ),

        layers.RandomContrast(
            0.10
        ),
    ],
    name="data_augmentation",
)


# ============================================================
# PRETRAINED MOBILENETV2
# ============================================================

print("\nLoading ImageNet MobileNetV2...")

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(
        IMG_SIZE[0],
        IMG_SIZE[1],
        3,
    ),
    include_top=False,
    weights="imagenet",
)

base_model.trainable = False


# ============================================================
# BUILD MODEL
# ============================================================

inputs = layers.Input(
    shape=(
        IMG_SIZE[0],
        IMG_SIZE[1],
        3,
    ),
    name="image",
)


x = data_augmentation(
    inputs
)


# MobileNetV2 preprocessing:
#
# [0, 255] -> [-1, 1]
#
# IMPORTANT:
# This preprocessing is embedded inside the saved model.

x = layers.Rescaling(
    1.0 / 127.5,
    offset=-1,
    name="mobilenetv2_preprocessing",
)(x)


x = base_model(
    x,
    training=False,
)


x = layers.GlobalAveragePooling2D(
    name="global_average_pooling"
)(x)


x = layers.Dense(
    128,
    activation="relu",
    name="classifier_dense",
)(x)


x = layers.Dropout(
    0.40,
    name="classifier_dropout",
)(x)


outputs = layers.Dense(
    len(class_names),
    activation="softmax",
    name="classification_output",
)(x)


model = Model(
    inputs=inputs,
    outputs=outputs,
    name="EcoSort_MobileNetV2",
)


# ============================================================
# INITIAL COMPILE
# ============================================================

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=INITIAL_LR
    ),

    loss="sparse_categorical_crossentropy",

    metrics=[
        tf.keras.metrics.SparseCategoricalAccuracy(
            name="accuracy"
        )
    ],
)


# ============================================================
# MODEL SUMMARY
# ============================================================

print("\nModel architecture:")

model.summary()


# ============================================================
# CALLBACKS
# ============================================================

checkpoint = tf.keras.callbacks.ModelCheckpoint(
    filepath=str(MODEL_PATH),
    monitor="val_accuracy",
    mode="max",
    save_best_only=True,
    verbose=1,
)


early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor="val_accuracy",
    mode="max",
    patience=4,
    restore_best_weights=True,
    verbose=1,
)


reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    mode="min",
    factor=0.5,
    patience=2,
    min_lr=1e-7,
    verbose=1,
)


# ============================================================
# PHASE 1 — CLASSIFIER TRAINING
# ============================================================

print("\n" + "=" * 60)
print("PHASE 1 — CLASSIFIER TRAINING")
print("=" * 60)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=INITIAL_EPOCHS,
    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr,
    ],
)


# ============================================================
# PHASE 2 — FINE TUNING
# ============================================================

print("\n" + "=" * 60)
print("PHASE 2 — MOBILENETV2 FINE TUNING")
print("=" * 60)


base_model.trainable = True


fine_tune_start = max(
    0,
    len(base_model.layers)
    - FINE_TUNE_LAST_LAYERS,
)


for index, layer in enumerate(
    base_model.layers
):

    if index < fine_tune_start:
        layer.trainable = False

    else:
        layer.trainable = True


# Keep BatchNormalization frozen
# for stable fine-tuning.

for layer in base_model.layers:

    if isinstance(
        layer,
        layers.BatchNormalization,
    ):
        layer.trainable = False


print(
    "Trainable MobileNetV2 layers:",
    sum(
        1
        for layer in base_model.layers
        if layer.trainable
    ),
)


# Recompile after changing trainable state.

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=FINE_TUNE_LR
    ),

    loss="sparse_categorical_crossentropy",

    metrics=[
        tf.keras.metrics.SparseCategoricalAccuracy(
            name="accuracy"
        )
    ],
)


fine_tune_checkpoint = (
    tf.keras.callbacks.ModelCheckpoint(
        filepath=str(MODEL_PATH),
        monitor="val_accuracy",
        mode="max",
        save_best_only=True,
        verbose=1,
    )
)


fine_tune_early_stopping = (
    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy",
        mode="max",
        patience=4,
        restore_best_weights=True,
        verbose=1,
    )
)


fine_tune_reduce_lr = (
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        mode="min",
        factor=0.5,
        patience=2,
        min_lr=1e-8,
        verbose=1,
    )
)


model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=FINE_TUNE_EPOCHS,
    callbacks=[
        fine_tune_checkpoint,
        fine_tune_early_stopping,
        fine_tune_reduce_lr,
    ],
)


# ============================================================
# LOAD BEST MODEL
# ============================================================

print("\nLoading best saved model...")

best_model = tf.keras.models.load_model(
    MODEL_PATH
)


# ============================================================
# FINAL VALIDATION
# ============================================================

print("\n" + "=" * 60)
print("FINAL VALIDATION")
print("=" * 60)

validation_results = best_model.evaluate(
    val_ds,
    verbose=1,
    return_dict=True,
)


validation_accuracy = float(
    validation_results.get(
        "accuracy",
        0.0,
    )
)


validation_loss = float(
    validation_results.get(
        "loss",
        0.0,
    )
)


print(
    "\nValidation accuracy:",
    round(
        validation_accuracy * 100,
        2,
    ),
    "%",
)


print(
    "Validation loss:",
    round(
        validation_loss,
        4,
    ),
)


# ============================================================
# FINAL SAVE
# ============================================================

best_model.save(
    MODEL_PATH
)


# ============================================================
# MODEL METADATA
# ============================================================

metadata = {
    "model_name": "EcoSort_MobileNetV2",

    "model_version": "MobileNetV2-v2",

    "architecture": "MobileNetV2",

    "input_size": [
        IMG_SIZE[0],
        IMG_SIZE[1],
    ],

    "input_channels": 3,

    "class_count": len(class_names),

    "classes": class_names,

    "class_indices": {
        class_name: index
        for index, class_name
        in enumerate(class_names)
    },

    "preprocessing": {
        "type": "embedded_rescaling",
        "formula": "pixel / 127.5 - 1.0",
        "input_range": "[0, 255]",
        "output_range": "[-1, 1]",
    },

    "output": {
        "activation": "softmax",
        "type": "probability_distribution",
    },

    "training": {
        "batch_size": BATCH_SIZE,
        "validation_split": VALIDATION_SPLIT,
        "seed": SEED,
        "initial_epochs": INITIAL_EPOCHS,
        "fine_tune_epochs": FINE_TUNE_EPOCHS,
        "initial_learning_rate": INITIAL_LR,
        "fine_tune_learning_rate": FINE_TUNE_LR,
    },

    "validation": {
        "accuracy": round(
            validation_accuracy,
            6,
        ),
        "accuracy_percent": round(
            validation_accuracy * 100,
            4,
        ),
        "loss": round(
            validation_loss,
            6,
        ),
    },
}


with open(
    METADATA_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        metadata,
        file,
        indent=2,
    )


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)

print(
    "Model saved:",
    MODEL_PATH,
)

print(
    "Metadata saved:",
    METADATA_PATH,
)

print(
    "Classes:",
    class_names,
)

print(
    "Validation accuracy:",
    round(
        validation_accuracy * 100,
        2,
    ),
    "%",
)

print(
    "Input:",
    f"{IMG_SIZE[0]}x{IMG_SIZE[1]} RGB",
)

print(
    "Preprocessing:",
    "embedded MobileNetV2 [-1, 1]",
)

print(
    "Output:",
    "softmax probabilities",
)

print("=" * 60)