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
    justifyContent: "flex-start",
    alignContent: "flex-start",
  },
  itemContainer: {
    alignItems: "center",
    margin: 2,
    height: 150,
  },
  outerContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  imageContainer: {
    width: 100,
    height: 100,
    overflow: "hidden",
  },
  unsolvedBackground: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  borderOverlay: {
    width: 120,
    height: 120,
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'contain',
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
  statusMessage: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
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