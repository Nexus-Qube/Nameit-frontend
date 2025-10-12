import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#000' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
    textAlign: 'center',
  },
  label: { 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#007AFF' 
  },
  subTitle: { 
    marginVertical: 15, 
    fontWeight: 'bold', 
    color: '#007AFF' 
  },
  lobbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    width: '100%',
  },
  lobbyText: { 
    flex: 1, 
    color: '#007AFF' 
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center', 
    color: '#007AFF' 
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    color: '#fff',
    backgroundColor: '#000',
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  topicItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  topicText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedTopic: {
    backgroundColor: '#007AFF',
  },
  sectionHeader: {
    backgroundColor: '#333',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  sectionHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});