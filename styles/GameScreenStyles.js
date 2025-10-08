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
  itemSquare: {
    width: 100,
    height: 100,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    margin: 5,
    borderRadius: 8,
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
  margin: 5,
  width: 100,       // match itemSquare
  height: 130,      // enough for square + caption
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
