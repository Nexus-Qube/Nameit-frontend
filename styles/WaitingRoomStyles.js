import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  lobbyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 5,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  lobbyCode: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginRight: 10,
  },
  copyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  playersList: {
    minHeight: 100,
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  playerName: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  playerStatus: {
    fontSize: 14,
    fontWeight: "bold",
  },
  readyStatus: {
    color: "#34C759",
  },
  notReadyStatus: {
    color: "#FF3B30",
  },
  rulesContainer: {
    minHeight: 150,
  },
  ruleItem: {
    marginBottom: 15,
  },
  ruleLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    backgroundColor: "#333",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555",
  },
  selectedOption: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  readyButton: {
    flex: 1,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  unreadyButton: {
    flex: 1,
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  leaveButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  countdownText: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  ownerBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  ownerBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  colorSection: {
  marginBottom: 15,
},
colorGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 5,
},
colorOption: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderColor: "#555",
},
selectedColor: {
  borderWidth: 3,
  borderColor: "#FFD700",
},
disabledColor: {
  opacity: 0.3,
},
colorOptionText: {
  fontSize: 16,
},
playerColorIndicator: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: 8,
},
colorRequiredText: {
  color: "#FF3B30",
  fontSize: 12,
  marginTop: 5,
  textAlign: "center",
},
});