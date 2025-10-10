import { StyleSheet } from "react-native";

export default StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  countdown: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
  },
  counter: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontWeight: "bold",
    color: "#1E90FF",
    fontSize: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
   outerContainer: {
    width: 120, // Matches your border image size
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative', // For absolute positioning of border
  },

  itemSquare: {
    width: 100,
    height: 100,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    overflow: "hidden", // Only affects the image, not the border
    position: 'relative', // Add this for the background image
  },

  unsolvedBackground: {
    width: 100,
    height: 100,
    position: 'absolute', // Cover the entire itemSquare
    top: 0,
    left: 0,
    resizeMode: 'cover', // or 'contain' depending on your image
  },
  imageContainer: {
    width: 100,
    height: 100,
    overflow: "hidden",
  },

  borderOverlay: {
    width: 120,
    height: 120,
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'contain',
  },
  
  solved: {
    backgroundColor: "green",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  pokemonImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  itemContainer: {
  alignItems: "center",
  margin: 2,
  width: 120,       // match itemSquare
  height: 150,      // enough for square + caption
},
pokemonName: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: "bold",
  color: "#fff",
  textAlign: "center",
},
statusMessage: {
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 4,
},
topRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},

bottomRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},

rowSection: {
  flex: 1,
  alignItems: "center",
},
rowLeft: {
  flex: 1,
  alignItems: "flex-start",
},
rowRight: {
  flex: 1,
  alignItems: "flex-end",
},
modalButton: {
  padding: 10,
  marginTop: 10,
  alignItems: 'center',
},
  
});
