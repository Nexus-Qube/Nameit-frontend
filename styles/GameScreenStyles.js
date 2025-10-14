import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
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
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontWeight: "bold",
    color: "#1E90FF",
    fontSize: 16,
  },
  grid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "flex-start", // Use flex-start for dynamic items per row
  paddingTop: 10,
  paddingBottom: 200,
  minHeight: '100%',
},
itemContainer: {
  alignItems: "center",
  margin: 4, // This gives the 8px total horizontal margin
  //marginBottom: 12,
  height: 150,
  // width will be set dynamically in the component
},
  outerContainer: {
  width: 120,           // Match item container width
  height: 120,          // Match image area height
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
},
imageContainer: {
  width: 100,           // Keep your original image size
  height: 100,          // Keep your original image size
  overflow: "hidden",
  borderRadius: 12,
},
  unsolvedBackground: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  borderOverlay: {
  width: 120,    // Match the image area width
  height: 120,   // Match the image area height
  position: "absolute",
  top: 0,        // Align to top of image area
  left: 0,       // Align to left of image area
  resizeMode: "contain",
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
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
  backgroundColor: "#fff",
  padding: 30,
  borderRadius: 12,
  alignItems: "center",
  width: "80%",
  boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.2)',
  elevation: 5, // Keep elevation for Android
},
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    color: "#555",
    textAlign: "center",
  },
  modalButton: {
    padding: 12,
    marginTop: 10,
    alignItems: "center",
    width: "60%",
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
});