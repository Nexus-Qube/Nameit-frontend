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
  graySquare: {
  width: '100%',
  height: '100%',
  backgroundColor: '#333',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 8,
},
checkmark: {
  color: '#4CAF50', // Green color
  fontSize: 36,
  fontWeight: 'bold',
},
selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
  selectedOverlay: {
    backgroundColor: 'rgba(0, 255, 0, 0.4)',
    borderWidth: 3,
    borderColor: '#00FF00',
  },
  selectableOverlay: {
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
  },
  selectionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  myHideSeekIndicator: {
  position: 'absolute',
  top: 2,
  right: 2,
  backgroundColor: 'rgba(255, 0, 0, 0.8)',
  paddingHorizontal: 4,
  paddingVertical: 2,
  borderRadius: 4,
  zIndex: 15,
  alignItems: 'center',
  justifyContent: 'center',
},
myHideSeekText: {
  color: '#fff',
  fontSize: 8,
  fontWeight: 'bold',
  lineHeight: 10,
},
myHideSeekItemName: {
  color: '#fff',
  fontSize: 8,
  fontWeight: 'bold',
  lineHeight: 10,
  marginTop: 1,
},
});